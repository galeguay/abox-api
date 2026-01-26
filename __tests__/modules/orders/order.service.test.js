import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// 1. Mockeamos el servicio de stock ANTES de importar orders.service
// Ajusta la ruta relativa hacia donde está stock.service.js desde ESTE archivo de test
jest.unstable_mockModule('../src/modules/stock/stock.service.js', () => ({
    registerStockExit: jest.fn(),
    registerStockEntry: jest.fn(),
    getProductStock: jest.fn()
}));

// Importamos el mock de stock para poder hacer expect() sobre él
const mockStockService = await import('../../../src/modules/stock/stock.service.js');
const ordersService = await import('../../../src/modules/orders/orders.service.js');

describe('Orders Service', () => {
    const mockCompanyId = 'company-1';
    const mockUserId = 'user-1';
    const mockWarehouseId = 'warehouse-1';

    // Factory para Order
    const createMockOrder = (overrides = {}) => ({
        id: 'order-1',
        companyId: mockCompanyId,
        status: 'PENDING',
        total: 100,
        subtotal: 100,
        items: [],
        payments: [],
        warehouseId: mockWarehouseId,
        ...overrides
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock crucial para transacciones: ejecuta el callback inmediatamente
        mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
    });

    describe('createOrder', () => {
        test('crea orden exitosamente con cálculos correctos', async () => {
            const inputData = {
                customerId: 'cust-1',
                warehouseId: mockWarehouseId,
                items: [{ productId: 'prod-1', quantity: 2, basePrice: 50 }], // Total item: 100
                discount: 10
            };

            // Mocks necesarios
            mockPrisma.warehouse.findFirst.mockResolvedValue({ id: mockWarehouseId, active: true });

            // CORRECCIÓN: Agregamos 'stocks' al mock del producto
            mockPrisma.product.findMany.mockResolvedValue([
                {
                    id: 'prod-1',
                    companyId: mockCompanyId,
                    costs: [{ cost: 30 }],
                    stocks: [{ quantity: 50, warehouseId: mockWarehouseId }] // Stock suficiente
                }
            ]);

            mockPrisma.order.create.mockResolvedValue(createMockOrder());

            await ordersService.createOrder(mockCompanyId, mockUserId, inputData);

            expect(mockPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        subtotal: 100,
                        total: 90,
                        items: {
                            create: expect.arrayContaining([
                                expect.objectContaining({
                                    productId: 'prod-1',
                                    cost: 30
                                })
                            ])
                        }
                    })
                })
            );
        });

        // Test extra recomendado
        test('falla si no hay stock suficiente al crear', async () => {
            const inputData = {
                warehouseId: mockWarehouseId,
                items: [{ productId: 'prod-1', quantity: 10, basePrice: 50 }],
            };

            mockPrisma.warehouse.findFirst.mockResolvedValue({ id: mockWarehouseId, active: true });

            // Stock insuficiente (tengo 5, pido 10)
            mockPrisma.product.findMany.mockResolvedValue([
                {
                    id: 'prod-1',
                    companyId: mockCompanyId,
                    stocks: [{ quantity: 5, warehouseId: mockWarehouseId }]
                }
            ]);

            await expect(ordersService.createOrder(mockCompanyId, mockUserId, inputData))
                .rejects.toThrow(/Stock insuficiente/);
        });
    });

    describe('updateOrderStatus', () => {
        test('CONFIRMED: debe confirmar orden y descontar stock', async () => {
            const orderId = 'order-1';

            // Orden en estado PENDING
            const mockOrder = createMockOrder({
                id: orderId,
                status: 'PENDING',
                items: [{ productId: 'prod-1', quantity: 5 }]
            });

            mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
            mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'CONFIRMED' });

            await ordersService.updateOrderStatus(mockCompanyId, orderId, 'CONFIRMED', mockUserId);

            // Verificamos que llamó al servicio de Stock
            expect(mockStockService.registerStockExit).toHaveBeenCalledWith(
                mockCompanyId,
                mockWarehouseId,
                [{ productId: 'prod-1', quantity: 5 }],
                orderId,
                mockUserId,
                expect.anything() // El transaction client
            );

            // Verificamos update de estado
            expect(mockPrisma.order.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: orderId },
                    data: { status: 'CONFIRMED' }
                })
            );
        });

        test('CANCELED: si ya estaba confirmada, devuelve stock', async () => {
            const orderId = 'order-1';

            // Orden ya CONFIRMED (stock ya salió)
            const mockOrder = createMockOrder({
                id: orderId,
                status: 'CONFIRMED',
                items: [{ productId: 'prod-1', quantity: 5 }]
            });

            mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

            await ordersService.updateOrderStatus(mockCompanyId, orderId, 'CANCELED', mockUserId);

            // Debe llamar a Stock Entry (devolución)
            expect(mockStockService.registerStockEntry).toHaveBeenCalledWith(
                mockCompanyId,
                mockOrder.warehouseId,
                [{ productId: 'prod-1', quantity: 5 }],
                orderId,
                mockUserId,
                expect.anything() // El transaction client
            );
            expect(mockPrisma.order.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { status: 'CANCELED' } })
            );
        });
    });

    describe('addOrderPayment', () => {
        test('agrega pago y actualiza estado a PAID si cubre el total', async () => {
            const orderId = 'order-1';
            const mockOrder = createMockOrder({
                total: 100,
                payments: []
            });

            mockPrisma.order.findFirst.mockResolvedValue(mockOrder);
            mockPrisma.orderPayment.create.mockResolvedValue({});

            await ordersService.addOrderPayment(mockCompanyId, orderId, {
                amount: 100,
                paymentMethod: 'CASH'
            });

            expect(mockPrisma.orderPayment.create).toHaveBeenCalled();
            expect(mockPrisma.order.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: orderId },
                    data: { paymentStatus: 'PAID' }
                })
            );
        });

        test('lanza error si el pago excede el total', async () => {
            const orderId = 'order-1';
            const mockOrder = createMockOrder({
                total: 100,
                payments: [{ amount: 50 }] // Ya pagó 50
            });

            mockPrisma.order.findFirst.mockResolvedValue(mockOrder);

            // Intenta pagar 60 más (50+60 = 110 > 100)
            await expect(ordersService.addOrderPayment(mockCompanyId, orderId, { amount: 60 }))
                .rejects.toThrow('El monto excede el total');
        });
    });
});