import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';
import AppError from '../../../src/errors/AppError.js';

// Import dinámico del servicio como en tu ejemplo
const warehousesService = await import('../../../src/modules/warehouses/warehouses.service.js');

describe('Warehouses Service', () => {
    const mockCompanyId = 'company-1';

    // Factory: Crea un objeto almacén limpio para cada prueba
    const createMockWarehouse = (overrides = {}) => ({
        id: 'warehouse-1',
        name: 'Almacén Central',
        companyId: mockCompanyId,
        active: true,
        createdAt: new Date(),
        stocks: [], // Simulamos la relación vacía por defecto
        _count: { stocks: 10 },
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createWarehouse', () => {
        test('crea un almacén correctamente', async () => {
            const newWarehouseData = { name: 'Nuevo Almacén' };

            // Simulamos la respuesta de Prisma
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

            // Mockeamos Promise.all: findMany y count
            mockPrisma.warehouse.findMany.mockResolvedValue(mockList);
            mockPrisma.warehouse.count.mockResolvedValue(mockTotal);

            const filters = { page: 1, limit: 10 };
            const result = await warehousesService.getWarehouses(mockCompanyId, filters);

            // Verificamos estructura de paginación
            expect(result.data).toHaveLength(2);
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 2,
                pages: 1
            });

            // Verificamos que se llame con el filtro de companyId
            expect(mockPrisma.warehouse.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ companyId: mockCompanyId }) })
            );
        });
    });

    describe('getWarehouseById', () => {
        test('devuelve el almacén con sus detalles si existe', async () => {
            const mockWarehouse = createMockWarehouse();
            mockPrisma.warehouse.findFirst.mockResolvedValue(mockWarehouse);

            const result = await warehousesService.getWarehouseById(mockCompanyId, 'warehouse-1');

            expect(result).toEqual(mockWarehouse);
            expect(mockPrisma.warehouse.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'warehouse-1', companyId: mockCompanyId }
                })
            );
        });

        test('lanza AppError si el almacén no existe', async () => {
            mockPrisma.warehouse.findFirst.mockResolvedValue(null);

            await expect(
                warehousesService.getWarehouseById(mockCompanyId, 'non-existent')
            ).rejects.toThrow(AppError);
        });
    });

    describe('updateWarehouse', () => {
        test('actualiza el almacén si pertenece a la empresa', async () => {
            // 1. Mock findFirst (Verificación de propiedad)
            mockPrisma.warehouse.findFirst.mockResolvedValue(createMockWarehouse());
            // 2. Mock update (Acción real)
            mockPrisma.warehouse.update.mockResolvedValue(createMockWarehouse({ name: 'Nombre Editado' }));

            const result = await warehousesService.updateWarehouse(mockCompanyId, 'warehouse-1', { name: 'Nombre Editado' });

            expect(result.name).toBe('Nombre Editado');
            expect(mockPrisma.warehouse.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'warehouse-1' },
                    data: expect.objectContaining({ name: 'Nombre Editado' })
                })
            );
        });

        test('lanza error si intenta editar almacén de otra empresa', async () => {
            // Simulamos que no encuentra el almacén bajo ese companyId
            mockPrisma.warehouse.findFirst.mockResolvedValue(null);

            await expect(
                warehousesService.updateWarehouse(mockCompanyId, 'warehouse-1', { name: 'Hacker' })
            ).rejects.toThrow(AppError);

            // Aseguramos que NO se ejecutó el update
            expect(mockPrisma.warehouse.update).not.toHaveBeenCalled();
        });
    });
});