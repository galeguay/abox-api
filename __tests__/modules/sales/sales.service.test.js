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
            // Ajustamos la estructura de pagos para que coincida con lo que espera el servicio
            payments: [{ paymentMethod: 'CASH', amount: 100 }],
            updateStock: true
        };

        test('crea venta guardando warehouseId y status', async () => {
            // Mocks
            mockPrisma.warehouse.findFirst.mockResolvedValue({ id: mockWarehouseId, active: true });

            // CORRECCIÓN 1: Mockear el cliente para evitar error 404
            mockPrisma.customer.findFirst.mockResolvedValue({ id: 'cust-1', active: true });

            mockPrisma.product.findMany.mockResolvedValue([
                {
                    id: 'prod-1',
                    companyId: mockCompanyId,
                    costs: [{ cost: 30 }],
                    stocks: [{ quantity: 50, warehouseId: mockWarehouseId }]
                }
            ]);

            mockPrisma.sale.create.mockResolvedValue(createMockSale({ id: 'sale-new' }));
            mockPrisma.salePayment.create.mockResolvedValue({});
            mockPrisma.moneyMovement.create.mockResolvedValue({});

            await salesService.createSale(mockCompanyId, mockUserId, inputData);

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

            const mockSale = createMockSale({
                warehouseId: mockWarehouseId,
                status: 'COMPLETED',
                items: [{ productId: 'prod-1', quantity: 1 }],
                payments: [{ amount: 100, paymentMethod: 'CASH' }]
            });

            mockPrisma.sale.findFirst.mockResolvedValue(mockSale);
            // Mockeamos el update para retornar la venta cancelada
            mockPrisma.sale.update.mockResolvedValue({ ...mockSale, status: 'CANCELED' });

            await salesService.cancelSale(mockCompanyId, saleId, mockUserId);

            // CORRECCIÓN 2: Se agrega el 7mo argumento 'SALE' que faltaba
            expect(mockStockService.registerStockEntry).toHaveBeenCalledWith(
                mockCompanyId,
                mockWarehouseId,
                expect.any(Array),
                saleId,
                mockUserId,
                expect.anything(), // El transaction client
                'SALE'
            );

            // CORRECCIÓN 3: Se espera paymentStatus: 'PENDING' en el update
            expect(mockPrisma.sale.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: saleId },
                    data: expect.objectContaining({
                        status: 'CANCELED',
                        paymentStatus: 'PENDING'
                    })
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

            await expect(salesService.cancelSale(mockCompanyId, saleId, mockUserId))
                .rejects.toThrow('ya fue anulada');

            expect(mockStockService.registerStockEntry).not.toHaveBeenCalled();
            expect(mockPrisma.moneyMovement.create).not.toHaveBeenCalled();
        });
    });
});