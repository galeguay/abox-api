import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

jest.unstable_mockModule('@prisma/client', () => ({
    Prisma: {
        Decimal: class MockDecimal {
            constructor(value) {
                this.value = Number(value);
            }
            toNumber() {
                return this.value;
            }
            plus(other) {
                return new MockDecimal(this.value + other.toNumber());
            }
        }
    }
}));

// Importamos el servicio DESPUÉS de haber definido el mock
const inventoryService = await import('../../../src/modules/inventory/inventory.service.js');

describe('Inventory Service', () => {
    const mockCompanyId = 'company-1';
    const mockProductId = 'product-1';
    const mockWarehouseId = 'warehouse-1';

    // Limpiamos los mocks antes de cada test para asegurar aislamiento
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // --- Factories (Generadores de datos) ---

    const createMockProduct = (overrides = {}) => ({
        id: mockProductId,
        companyId: mockCompanyId,
        name: 'Test Product',
        sku: 'SKU-001',
        active: true,
        ...overrides
    });

    const createMockWarehouse = (overrides = {}) => ({
        id: mockWarehouseId,
        companyId: mockCompanyId,
        name: 'Main Warehouse',
        active: true,
        ...overrides
    });

    const createMockStock = (overrides = {}) => ({
        id: 'stock-1',
        productId: mockProductId,
        warehouseId: mockWarehouseId,
        quantity: 10, // Simulamos el valor crudo que viene de la BD
        updatedAt: new Date(),
        warehouse: createMockWarehouse(),
        ...overrides
    });

    // --- Tests ---

    describe('getStockByProduct', () => {
        test('retorna stock y detalles correctamente cuando existe', async () => {
            // Setup
            mockPrisma.product.findFirst.mockResolvedValue(createMockProduct());
            mockPrisma.warehouse.findFirst.mockResolvedValue(createMockWarehouse());
            mockPrisma.stock.findFirst.mockResolvedValue(createMockStock({ quantity: 50 }));

            // Execute
            const result = await inventoryService.getStockByProduct(mockCompanyId, mockProductId, mockWarehouseId);

            // Assert
            expect(result.quantity).toBe(50);
            expect(result.product.sku).toBe('SKU-001');
            expect(result.warehouse.name).toBe('Main Warehouse');
        });

        test('retorna quantity 0 si el registro de stock no existe', async () => {
            mockPrisma.product.findFirst.mockResolvedValue(createMockProduct());
            mockPrisma.warehouse.findFirst.mockResolvedValue(createMockWarehouse());
            mockPrisma.stock.findFirst.mockResolvedValue(null); // No hay stock registrado

            const result = await inventoryService.getStockByProduct(mockCompanyId, mockProductId, mockWarehouseId);

            expect(result.quantity).toBe(0);
        });

        test('lanza error si el producto no existe', async () => {
            mockPrisma.product.findFirst.mockResolvedValue(null);

            await expect(
                inventoryService.getStockByProduct(mockCompanyId, 'invalid-id', mockWarehouseId)
            ).rejects.toHaveProperty('message', 'Producto no encontrado');
        });
    });

    describe('getTotalStock', () => {
        test('suma correctamente el stock de múltiples almacenes', async () => {
            mockPrisma.product.findFirst.mockResolvedValue(createMockProduct());

            // Simulamos stock en 2 almacenes distintos
            mockPrisma.stock.findMany.mockResolvedValue([
                createMockStock({ quantity: 10, warehouse: { id: 'w1', name: 'W1' } }),
                createMockStock({ quantity: 5, warehouse: { id: 'w2', name: 'W2' } })
            ]);

            const result = await inventoryService.getTotalStock(mockCompanyId, mockProductId);

            // 10 + 5 debe ser 15
            expect(result.totalQuantity).toBe(15);
            expect(result.byWarehouse).toHaveLength(2);
        });
    });

    describe('getInventoryReport', () => {
        test('genera reporte combinando productos y agregaciones de stock', async () => {
            // 1. Mock de Productos (Paginación)
            mockPrisma.product.count.mockResolvedValue(2);
            mockPrisma.product.findMany.mockResolvedValue([
                createMockProduct({ id: 'p1', name: 'Prod A' }),
                createMockProduct({ id: 'p2', name: 'Prod B' })
            ]);

            // 2. Mock de groupBy (La optimización que hicimos)
            // Simulamos que Prod A tiene 100 unidades y Prod B tiene 0 (o no aparece)
            mockPrisma.stock.groupBy.mockResolvedValue([
                { productId: 'p1', _sum: { quantity: 100 } }
            ]);

            // 3. Mock de findMany para detalles (opcional en el servicio, pero mockeamos por si acaso)
            mockPrisma.stock.findMany.mockResolvedValue([
                createMockStock({ productId: 'p1', quantity: 100 })
            ]);

            const result = await inventoryService.getInventoryReport(mockCompanyId, 1, 10);

            // Verificaciones
            expect(result.items).toHaveLength(2);

            // Producto A debe tener 100 de stock
            const prodA = result.items.find(i => i.id === 'p1');
            expect(prodA.totalQuantity).toBe(100);

            // Producto B (sin entrada en groupBy) debe tener 0
            const prodB = result.items.find(i => i.id === 'p2');
            expect(prodB.totalQuantity).toBe(0);

            // Verificamos paginación
            expect(result.pagination.totalItems).toBe(2);
        });
    });
});