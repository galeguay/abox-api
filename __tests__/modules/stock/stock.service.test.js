import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { Prisma } from '@prisma/client'; // <--- IMPORTANTE: Necesario para comparar Decimals
import { mockPrisma } from '../../mocks/prisma.js';

// Import dinámico del servicio
const stockService = await import('../../../src/modules/stock/stock.service.js');

describe('Stock Service', () => {
    const mockCompanyId = 'company-1';
    const mockWarehouseId = 'warehouse-1';
    const mockUserId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
    });

    describe('registerStockExit (Salida Automática)', () => {
        test('crea movimiento OUT con referencia SALE y decrementa stock', async () => {
            const items = [{ productId: 'prod-1', quantity: 5 }];
            const referenceId = 'sale-123';

            // Simulamos éxito en la resta
            mockPrisma.stock.updateMany.mockResolvedValue({ count: 1 });

            await stockService.registerStockExit(
                mockCompanyId,
                mockWarehouseId,
                items,
                referenceId,
                mockUserId,
                mockPrisma
            );

            // CORRECCIÓN: Validamos que sea un Decimal y luego verificamos su valor
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: 'OUT',
                        quantity: expect.any(Prisma.Decimal), // Aceptamos objeto Decimal
                        referenceType: 'SALE'
                    })
                })
            );

            // Verificación extra del valor exacto
            const callArgs = mockPrisma.stockMovement.create.mock.calls[0][0];
            expect(callArgs.data.quantity.toString()).toBe('5');

            expect(mockPrisma.stock.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        productId: 'prod-1',
                        warehouseId: mockWarehouseId,
                        quantity: { gte: 5 }
                    },
                    data: { quantity: { decrement: 5 } }
                })
            );
        });
    });

    describe('transferStock (Transferencia entre Almacenes)', () => {
        const transferData = {
            productId: 'prod-1',
            fromWarehouseId: 'wh-A',
            toWarehouseId: 'wh-B',
            quantity: 10,
            notes: 'Test transfer'
        };

        test('debe fallar si origen y destino son iguales', async () => {
            const dataMala = { ...transferData, toWarehouseId: 'wh-A' };

            await expect(
                stockService.transferStock(mockCompanyId, dataMala, mockUserId)
            ).rejects.toThrow('Origen y destino deben ser distintos');
        });

        test('debe fallar si no hay stock suficiente en origen', async () => {
            mockPrisma.stock.updateMany.mockResolvedValue({ count: 0 });

            await expect(
                stockService.transferStock(mockCompanyId, transferData, mockUserId)
            ).rejects.toThrow(/Stock insuficiente/);
        });

        test('debe realizar la transferencia correctamente (OUT en A, IN en B)', async () => {
            mockPrisma.stock.updateMany.mockResolvedValue({ count: 1 });

            await stockService.transferStock(mockCompanyId, transferData, mockUserId);

            expect(mockPrisma.stock.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        productId: 'prod-1',
                        warehouseId: 'wh-A',
                        quantity: { gte: 10 }
                    },
                    data: { quantity: { decrement: 10 } }
                })
            );

            expect(mockPrisma.stock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        productId_warehouseId: { productId: 'prod-1', warehouseId: 'wh-B' }
                    },
                    update: { quantity: { increment: 10 } },
                    create: expect.objectContaining({ quantity: 10 })
                })
            );
        });
    });

    describe('createManualAdjustment (Ajuste Manual)', () => {
        test('debe fallar si es salida (OUT) y no hay stock', async () => {
            mockPrisma.stock.updateMany.mockResolvedValue({ count: 0 });

            await expect(
                stockService.createManualAdjustment(mockCompanyId, {
                    productId: 'prod-1',
                    warehouseId: mockWarehouseId,
                    type: 'OUT',
                    quantity: 10
                }, mockUserId)
            ).rejects.toThrow('Stock insuficiente');
        });

        test('debe registrar ajuste positivo (IN)', async () => {
            await stockService.createManualAdjustment(mockCompanyId, {
                productId: 'prod-1',
                warehouseId: mockWarehouseId,
                type: 'IN',
                quantity: 5,
                notes: 'Found items'
            }, mockUserId);

            // CORRECCIÓN: Usamos expect.any(Prisma.Decimal)
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: 'IN',
                        quantity: expect.any(Prisma.Decimal)
                    })
                })
            );

            // Verificamos que el valor decimal sea 5
            // Nota: createManualAdjustment usa transaction, asi que puede ser la 2da llamada global al mock si no se reseteó,
            // pero como tenemos beforeEach(clearAllMocks), debería ser la única llamada en este test.
            const callArgs = mockPrisma.stockMovement.create.mock.calls[0][0];
            expect(callArgs.data.quantity.toString()).toBe('5');

            expect(mockPrisma.stock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: { quantity: { increment: 5 } }
                })
            );
        });
    });
});