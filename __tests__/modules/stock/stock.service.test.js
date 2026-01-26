import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// Import dinámico del servicio
const stockService = await import('../../../src/modules/stock/stock.service.js');

describe('Stock Service', () => {
    const mockCompanyId = 'company-1';
    const mockWarehouseId = 'warehouse-1';
    const mockUserId = 'user-123';

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock básico para transacciones: ejecuta el callback inmediatamente
        mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
    });

    describe('registerStockExit (Salida Automática)', () => {
        test('crea movimiento OUT con referencia SALE y decrementa stock', async () => {
            const items = [{ productId: 'prod-1', quantity: 5 }];
            const referenceId = 'sale-123';

            // CORRECCIÓN AQUÍ: Agregamos mockUserId antes de mockPrisma
            await stockService.registerStockExit(
                mockCompanyId,
                mockWarehouseId,
                items,
                referenceId,
                mockUserId,
                mockPrisma
            );

            // 1. Verificamos type OUT y referenceType SALE (corregido de ORDER a SALE)
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: 'OUT',
                        quantity: 5,
                        referenceId: referenceId,
                        referenceType: 'SALE'
                    })
                })
            );

            // 2. Verificamos decremento (-5)
            expect(mockPrisma.stock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        productId_warehouseId: { productId: 'prod-1', warehouseId: mockWarehouseId }
                    },
                    update: { quantity: { increment: -5 } }
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
            // Simulamos que hay 5 en stock, pero queremos mover 10
            mockPrisma.stock.findUnique.mockResolvedValue({ quantity: 5 });

            await expect(
                stockService.transferStock(mockCompanyId, transferData, mockUserId)
            ).rejects.toThrow('Stock insuficiente');
        });

        test('debe realizar la transferencia correctamente (OUT en A, IN en B)', async () => {
            // Simulamos stock suficiente (20)
            mockPrisma.stock.findUnique.mockResolvedValue({ quantity: 20 });

            await stockService.transferStock(mockCompanyId, transferData, mockUserId);

            // Verificamos que se llame a create 2 veces
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledTimes(2);

            // 1. Verificamos la SALIDA (Origen)
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        warehouseId: 'wh-A',
                        type: 'OUT',          // <--- CAMBIO: Ahora esperamos OUT
                        referenceType: 'TRANSFER', // Pero mantenemos la referencia TRANSFER
                        quantity: 10
                    })
                })
            );

            // 2. Verificamos la ENTRADA (Destino)
            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        warehouseId: 'wh-B',
                        type: 'IN',           // <--- CAMBIO: Ahora esperamos IN
                        referenceType: 'TRANSFER',
                        quantity: 10
                    })
                })
            );

            // Verificamos actualización de saldos
            // Upsert para wh-A (resta)
            expect(mockPrisma.stock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { productId_warehouseId: { productId: 'prod-1', warehouseId: 'wh-A' } },
                    update: { quantity: { increment: -10 } }
                })
            );

            // Upsert para wh-B (suma)
            expect(mockPrisma.stock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { productId_warehouseId: { productId: 'prod-1', warehouseId: 'wh-B' } },
                    update: { quantity: { increment: 10 } }
                })
            );
        });
    });

    describe('createManualAdjustment (Ajuste Manual)', () => {
        test('debe fallar si es salida (OUT) y no hay stock', async () => {
            mockPrisma.stock.findUnique.mockResolvedValue({ quantity: 0 });

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

            expect(mockPrisma.stockMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: 'IN',
                        quantity: 5,
                        createdById: mockUserId
                    })
                })
            );

            expect(mockPrisma.stock.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    update: { quantity: { increment: 5 } }
                })
            );
        });
    });
});