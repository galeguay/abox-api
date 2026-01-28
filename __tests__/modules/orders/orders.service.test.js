import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';
import { Prisma } from '@prisma/client'; // Importante para manejar Decimal

// Mock del Stock Service
jest.unstable_mockModule('../src/modules/stock/stock.service.js', () => ({
    registerStockExit: jest.fn(),
    registerStockEntry: jest.fn(),
    getProductStock: jest.fn()
}));

// Mock del Sales Service (necesario si addOrderPayment dispara la creación de venta)
jest.unstable_mockModule('../src/modules/sales/sales.service.js', () => ({
    createSaleFromOrder: jest.fn()
}));

const ordersService = await import('../../../src/modules/orders/orders.service.js');
const mockStockService = await import('../../../src/modules/stock/stock.service.js');

describe('Orders Service', () => {
    const mockCompanyId = 'company-1';
    const mockUserId = 'user-1';
    const mockWarehouseId = 'warehouse-1';

    beforeEach(() => {
        jest.clearAllMocks();

        // 1. Mock de Transacción (Pass-through)
        mockPrisma.$transaction.mockImplementation(async (callback) => {
            return callback(mockPrisma);
        });

        // 2. MOCKS GLOBALES
        mockPrisma.warehouse.findFirst.mockResolvedValue({
            id: mockWarehouseId,
            companyId: mockCompanyId,
            active: true
        });

        // Simular que findMany de pagos devuelva un array vacío por defecto
        mockPrisma.orderPayment.findMany.mockResolvedValue([]);
    });

    describe('createOrder', () => {
        test('debe usar el precio del producto si no se envía basePrice (Fallback)', async () => {
            const inputData = {
                warehouseId: mockWarehouseId,
                items: [{ productId: 'prod-1', quantity: 2 }],
                discount: 0
            };

            mockPrisma.product.findMany.mockResolvedValue([{
                id: 'prod-1',
                name: 'Test',
                price: new Prisma.Decimal(150.00),
                costs: [{ cost: new Prisma.Decimal(100) }],
                stocks: [{ quantity: new Prisma.Decimal(10) }]
            }]);

            mockPrisma.order.create.mockResolvedValue({ id: 'order-1' });

            await ordersService.createOrder(mockCompanyId, mockUserId, inputData);

            // Verificamos que se usó 150.00 * 2 = 300
            // Usamos objectContaining porque subtotal en la DB es Decimal
            expect(mockPrisma.order.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ 
                        subtotal: expect.any(Object) // Prisma.Decimal es un objeto
                    })
                })
            );
        });
    });

    describe('updateOrder (Lógica Rollback & Re-apply)', () => {
        test('debe devolver todo el stock previo y reservar el nuevo total', async () => {
            const orderId = 'order-1';
            
            const oldOrder = {
                id: orderId,
                companyId: mockCompanyId,
                warehouseId: mockWarehouseId,
                status: 'PENDING',
                discount: new Prisma.Decimal(0),
                deliveryFee: new Prisma.Decimal(0),
                items: [{ productId: 'prod-1', quantity: new Prisma.Decimal(5) }]
            };

            const updateData = {
                items: [{ productId: 'prod-1', quantity: 8, basePrice: 100 }]
            };

            mockPrisma.order.findUnique.mockResolvedValue(oldOrder);
            
            mockPrisma.product.findMany.mockResolvedValue([{
                id: 'prod-1',
                name: 'Prod',
                price: new Prisma.Decimal(100),
                stocks: [{ quantity: new Prisma.Decimal(20) }],
                costs: [{ cost: new Prisma.Decimal(50) }]
            }]);

            mockPrisma.order.update.mockResolvedValue({ id: orderId });

            await ordersService.updateOrder(mockCompanyId, orderId, mockUserId, updateData);

            // 1. Debe devolver lo viejo (5)
            expect(mockStockService.registerStockEntry).toHaveBeenCalledWith(
                mockCompanyId, mockWarehouseId,
                expect.arrayContaining([expect.objectContaining({ quantity: expect.any(Object) })]),
                orderId, mockUserId, mockPrisma, expect.anything()
            );

            // 2. Debe reservar lo nuevo completo (8)
            expect(mockStockService.registerStockExit).toHaveBeenCalledWith(
                mockCompanyId, mockWarehouseId,
                expect.arrayContaining([expect.objectContaining({ quantity: expect.any(Object) })]),
                orderId, mockUserId, mockPrisma, expect.anything()
            );
        });
    });

    describe('addOrderPayment', () => {
        test('no debe permitir pagos que superen el total de la orden', async () => {
            const orderId = 'order-1';
            
            // Simulación crítica: 'amount' DEBE ser Prisma.Decimal para que el .add() funcione
            mockPrisma.order.findFirst.mockResolvedValue({
                id: orderId,
                companyId: mockCompanyId,
                total: new Prisma.Decimal(100),
                status: 'PENDING',
                payments: [{ amount: new Prisma.Decimal(50) }] 
            });

            const paymentData = { amount: 60, paymentMethod: 'CASH' };

            await expect(ordersService.addOrderPayment(mockCompanyId, orderId, paymentData, mockUserId))
                .rejects.toThrow(/El monto excede el total pendiente/);
        });
    });
});