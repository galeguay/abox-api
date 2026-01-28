import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js'; // Tu mock centralizado
import { Prisma } from '@prisma/client';


// 2. Importación dinámica del servicio A TESTEAR (después de definir los mocks)
const movementService = await import('../../../src/modules/stock-movements/stock-movements.service.js');

describe('Stock Movements Service', () => {
    const mockCompanyId = 'company-1';

    beforeEach(() => {
        jest.clearAllMocks();

        // Configuración básica del mock de transacción (Pass-through)
        // Aunque logStockMovement usa "tx" pasado por parámetro, es buena práctica tenerlo
        mockPrisma.$transaction.mockImplementation(async (callback) => {
            return callback(mockPrisma);
        });
    });

    describe('logStockMovement', () => {
        test('debe registrar un movimiento convirtiendo quantity a Decimal y usando la transacción', async () => {
            const inputData = {
                companyId: mockCompanyId,
                warehouseId: 'warehouse-1',
                productId: 'prod-1',
                type: 'IN',
                quantity: 10.5, // Número JS normal (float)
                referenceType: 'PURCHASE',
                referenceId: 'ref-1',
                notes: 'Test note',
                userId: 'user-1'
            };

            // Simulamos la "tx" (transacción) que viene desde stock.service
            // En este caso, podemos usar el mismo mockPrisma o un objeto simple
            const mockTx = {
                stockMovement: {
                    create: jest.fn().mockResolvedValue({ id: 'movement-1' })
                }
            };

            await movementService.logStockMovement(inputData, mockTx);

            // Verificamos que se llamó al create DE LA TRANSACCIÓN (no del prisma global)
            expect(mockTx.stockMovement.create).toHaveBeenCalledTimes(1);
            
            // Verificamos la conversión de tipos
            expect(mockTx.stockMovement.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    companyId: mockCompanyId,
                    type: 'IN',
                    // Verificamos que se transformó a Decimal
                    quantity: expect.any(Prisma.Decimal),
                    notes: 'Test note'
                })
            });

            // Verificación extra para asegurar que el valor del Decimal es correcto
            const callArgs = mockTx.stockMovement.create.mock.calls[0][0];
            expect(callArgs.data.quantity.toString()).toBe('10.5');
        });
    });

    describe('getStockMovements (Lectura y Filtros)', () => {
        test('debe calcular la paginación y devolver estructura correcta', async () => {
            const filters = { page: 2, limit: 5 }; // Skip debería ser 5

            // Setup de respuestas simuladas
            mockPrisma.stockMovement.findMany.mockResolvedValue([{ id: 'mov-1' }]);
            mockPrisma.stockMovement.count.mockResolvedValue(20); // Total ficticio

            const result = await movementService.getStockMovements(mockCompanyId, filters);

            // 1. Verificar llamada a Prisma con skip/take correctos
            expect(mockPrisma.stockMovement.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ companyId: mockCompanyId }),
                    skip: 5, // (2 - 1) * 5
                    take: 5,
                    orderBy: { createdAt: 'desc' }
                })
            );

            // 2. Verificar estructura de retorno
            expect(result).toEqual({
                data: [{ id: 'mov-1' }],
                pagination: {
                    page: 2,
                    limit: 5,
                    total: 20,
                    pages: 4 // Math.ceil(20 / 5)
                }
            });
        });

        test('debe construir correctamente el filtro de fechas y tipos', async () => {
            const filters = {
                type: 'OUT',
                startDate: '2023-01-01',
                endDate: '2023-01-31',
                productId: 'prod-x'
            };

            mockPrisma.stockMovement.findMany.mockResolvedValue([]);
            mockPrisma.stockMovement.count.mockResolvedValue(0);

            await movementService.getStockMovements(mockCompanyId, filters);

            // Verificar construcción del WHERE
            expect(mockPrisma.stockMovement.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        companyId: mockCompanyId,
                        type: 'OUT',
                        productId: 'prod-x',
                        createdAt: {
                            gte: expect.any(Date),
                            lte: expect.any(Date)
                        }
                    })
                })
            );

            // Validar que las fechas sean objetos Date válidos
            const callArgs = mockPrisma.stockMovement.findMany.mock.calls[0][0];
            const createdFilter = callArgs.where.createdAt;
            
            expect(createdFilter.gte.toISOString()).toContain('2023-01-01');
        });
    });
});