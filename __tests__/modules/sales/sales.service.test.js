import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// Mock del servicio de stock
jest.unstable_mockModule('../src/modules/stock/stock.service.js', () => ({
    registerStockExit: jest.fn(),
    registerStockEntry: jest.fn(),
    getProductStock: jest.fn()
}));

const mockStockService = await import('../../../src/modules/stock/stock.service.js');
const salesService = await import('../../../src/modules/sales/sales.service.js');

describe('Sales Service', () => {
    const mockCompanyId = 'company-1';
    const mockUserId = 'user-1';
    const mockWarehouseId = 'warehouse-1';

    // Factory actualizado con los nuevos campos
    const createMockSale = (overrides = {}) => ({
        id: 'sale-1',
        companyId: mockCompanyId,
        status: 'COMPLETED',
        total: 100,
        subtotal: 100,
        warehouseId: mockWarehouseId,
        items: [],
        payments: [],
        createdById: mockUserId,
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
    });

    describe('createSale', () => {
        const inputData = {
            customerId: 'cust-1',
            warehouseId: mockWarehouseId,
            items: [{ productId: 'prod-1', quantity: 2, price: 50 }],
            discount: 0,
            paymentMethod: 'CASH',
            amountPaid: 100
        };

        test('crea venta guardando warehouseId y status', async () => {
            // Mocks
            mockPrisma.warehouse.findFirst.mockResolvedValue({ id: mockWarehouseId, active: true });
            mockPrisma.product.findMany.mockResolvedValue([
                { id: 'prod-1', companyId: mockCompanyId, costs: [{ cost: 30 }] }
            ]);
            mockPrisma.sale.create.mockResolvedValue(createMockSale({ id: 'sale-new' }));
            mockPrisma.salePayment.create.mockResolvedValue({});
            mockPrisma.moneyMovement.create.mockResolvedValue({});

            await salesService.createSale(mockCompanyId, mockUserId, inputData);

            // Verificamos que se guardan los nuevos campos
            expect(mockPrisma.sale.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        warehouseId: mockWarehouseId,
                        status: 'COMPLETED',
                        items: {
                            create: expect.arrayContaining([
                                expect.objectContaining({ productId: 'prod-1' })
                            ])
                        }
                    })
                })
            );
        });
    });

    describe('cancelSale', () => {
        test('anula venta detectando automáticamente el warehouseId de la venta', async () => {
            const saleId = 'sale-1';
            
            // Simulamos venta que YA tiene warehouseId guardado
            const mockSale = createMockSale({
                warehouseId: mockWarehouseId,
                status: 'COMPLETED',
                items: [{ productId: 'prod-1', quantity: 1 }],
                payments: [{ amount: 100 }]
            });

            mockPrisma.sale.findFirst.mockResolvedValue(mockSale);
            // Mockeamos el update para retornar la venta cancelada
            mockPrisma.sale.update.mockResolvedValue({ ...mockSale, status: 'CANCELED' });

            // LLAMADA: Nota que NO pasamos warehouseId como 4to parámetro
            // salesService.cancelSale(companyId, saleId, userId, warehouseId?)
            await salesService.cancelSale(mockCompanyId, saleId, mockUserId); 

            // 1. Verificamos que usó el warehouseId de la venta para devolver stock
            expect(mockStockService.registerStockEntry).toHaveBeenCalledWith(
                mockCompanyId,
                mockWarehouseId,
                expect.any(Array),
                saleId,
                 mockUserId,
                expect.anything() // El transaction client
            );

            // 2. Verificamos que actualiza el estado a CANCELED
            expect(mockPrisma.sale.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: saleId },
                    data: { status: 'CANCELED' }
                })
            );
        });

        test('falla si la venta ya estaba cancelada', async () => {
            const saleId = 'sale-canceled';
            
            const mockSale = createMockSale({
                status: 'CANCELED',
                warehouseId: mockWarehouseId
            });

            mockPrisma.sale.findFirst.mockResolvedValue(mockSale);

            // Debe lanzar error
            await expect(salesService.cancelSale(mockCompanyId, saleId, mockUserId))
                .rejects.toThrow('ya fue anulada');
            
            // Asegura que no movió stock ni dinero
            expect(mockStockService.registerStockEntry).not.toHaveBeenCalled();
            expect(mockPrisma.moneyMovement.create).not.toHaveBeenCalled();
        });
    });
});