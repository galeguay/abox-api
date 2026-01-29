import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';
import AppError from '../../../src/errors/AppError.js';
import * as warehousesService from '../../../src/modules/warehouses/warehouses.service.js';

describe('Warehouses Service', () => {
    const mockCompanyId = 'company-1';

    // Factory: Crea un objeto almacén limpio para cada prueba
    const createMockWarehouse = (overrides = {}) => ({
        id: 'warehouse-1',
        name: 'Almacén Central',
        companyId: mockCompanyId,
        active: true,
        createdAt: new Date(),
        stocks: [], 
        _count: { stocks: 10 }, // Simulamos el count que pide el servicio
        ...overrides
    });

    // Factory: Crea un objeto Stock para las pruebas de stocks
    const createMockStock = (overrides = {}) => ({
        id: 'stock-1',
        productId: 'prod-1',
        warehouseId: 'warehouse-1',
        quantity: 50,
        product: {
            id: 'prod-1',
            name: 'Producto Test',
            sku: 'SKU-123'
        },
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createWarehouse', () => {
        test('crea un almacén correctamente', async () => {
            const newWarehouseData = { name: 'Nuevo Almacén' };

            mockPrisma.warehouse.create.mockResolvedValue(createMockWarehouse(newWarehouseData));

            const result = await warehousesService.createWarehouse(mockCompanyId, newWarehouseData);

            expect(result.name).toBe('Nuevo Almacén');
            expect(mockPrisma.warehouse.create).toHaveBeenCalledWith({
                data: {
                    name: newWarehouseData.name,
                    companyId: mockCompanyId,
                    active: true,
                },
            });
        });
    });

    describe('getWarehouses', () => {
        test('devuelve lista paginada y totales', async () => {
            const mockList = [
                createMockWarehouse({ id: 'wh-1' }),
                createMockWarehouse({ id: 'wh-2' })
            ];
            const mockTotal = 2;

            mockPrisma.warehouse.findMany.mockResolvedValue(mockList);
            mockPrisma.warehouse.count.mockResolvedValue(mockTotal);

            const filters = { page: 1, limit: 10, active: true };
            const result = await warehousesService.getWarehouses(mockCompanyId, filters);

            expect(result.data).toHaveLength(2);
            expect(result.pagination.total).toBe(2);
            
            // Verificamos que filters.active se pase al where
            expect(mockPrisma.warehouse.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ 
                    where: { 
                        companyId: mockCompanyId,
                        active: true 
                    } 
                })
            );
        });
    });

    describe('getWarehouseById', () => {
        test('devuelve el almacén si existe', async () => {
            const mockWarehouse = createMockWarehouse();
            mockPrisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

            const result = await warehousesService.getWarehouseById(mockCompanyId, 'warehouse-1');

            expect(result).toEqual(mockWarehouse);
            expect(mockPrisma.warehouse.findFirst).toHaveBeenCalledWith({
                where: { id: 'warehouse-1', companyId: mockCompanyId }
            });
        });

        test('lanza AppError si el almacén no existe', async () => {
            mockPrisma.warehouse.findFirst.mockResolvedValue(null);

            await expect(
                warehousesService.getWarehouseById(mockCompanyId, 'non-existent')
            ).rejects.toThrow(AppError);
        });
    });

    // --- NUEVOS TESTS AÑADIDOS ---
    describe('getWarehouseStocks', () => {
        test('devuelve stocks paginados si el almacén existe', async () => {
            // 1. Mock de validación del almacén
            mockPrisma.warehouse.findFirst.mockResolvedValue(createMockWarehouse());
            
            // 2. Mock de búsqueda de stocks
            const mockStocks = [createMockStock(), createMockStock({ id: 'stock-2' })];
            mockPrisma.stock.findMany.mockResolvedValue(mockStocks);
            mockPrisma.stock.count.mockResolvedValue(2);

            const result = await warehousesService.getWarehouseStocks(mockCompanyId, 'warehouse-1', { page: 1 });

            expect(result.data).toHaveLength(2);
            expect(result.data[0].product.name).toBe('Producto Test');
            
            // Verifica que se llamó primero a validar el almacén
            expect(mockPrisma.warehouse.findFirst).toHaveBeenCalled();
            // Verifica la query de stocks
            expect(mockPrisma.stock.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ warehouseId: 'warehouse-1' })
                })
            );
        });

        test('lanza error si el almacén no existe antes de buscar stocks', async () => {
            // Simulamos que el almacén no existe
            mockPrisma.warehouse.findFirst.mockResolvedValue(null);

            await expect(
                warehousesService.getWarehouseStocks(mockCompanyId, 'warehouse-X', {})
            ).rejects.toThrow(AppError);

            // Importante: Asegurar que NO intentó buscar stocks si falló el almacén
            expect(mockPrisma.stock.findMany).not.toHaveBeenCalled();
        });
    });
    // -----------------------------

    describe('updateWarehouse', () => {
        test('actualiza el almacén si pertenece a la empresa', async () => {
            mockPrisma.warehouse.findFirst.mockResolvedValue(createMockWarehouse());
            mockPrisma.warehouse.update.mockResolvedValue(createMockWarehouse({ name: 'Nombre Editado' }));

            const result = await warehousesService.updateWarehouse(mockCompanyId, 'warehouse-1', { name: 'Nombre Editado' });

            expect(result.name).toBe('Nombre Editado');
            expect(mockPrisma.warehouse.update).toHaveBeenCalled();
        });

        test('lanza error si intenta editar almacén inexistente o de otra empresa', async () => {
            mockPrisma.warehouse.findFirst.mockResolvedValue(null);

            await expect(
                warehousesService.updateWarehouse(mockCompanyId, 'warehouse-1', { name: 'Hacker' })
            ).rejects.toThrow(AppError);

            expect(mockPrisma.warehouse.update).not.toHaveBeenCalled();
        });
    });
});