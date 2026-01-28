import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// Import dinámico del servicio
const moneyService = await import('../../../src/modules/money-movements/money-movements.service.js');

// --- HELPER PARA SIMULAR PRISMA DECIMAL ---
// Esto evita el crash de ".toNumber is not a function"
const mockDecimal = (value) => ({
    toNumber: () => value,
    toString: () => String(value),
    equals: (other) => value === other,
});

describe('Money Movements Service', () => {
    const mockCompanyId = 'company-1';
    const mockUserId = 'user-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // 1. TEST DE CREACIÓN
    // ==========================================
    describe('createMoneyMovement', () => {
        test('crea un movimiento manual exitosamente', async () => {
            const data = {
                type: 'OUT',
                amount: 100,
                paymentMethod: 'CASH',
                description: 'Gasto vario',
                categoryId: 'cat-1'
            };

            mockPrisma.moneyCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
            mockPrisma.moneyMovement.create.mockResolvedValue({ id: 'mov-1', ...data });

            const result = await moneyService.createMoneyMovement(mockCompanyId, mockUserId, data);

            expect(mockPrisma.moneyCategory.findFirst).toHaveBeenCalled();
            expect(mockPrisma.moneyMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: 'OUT',
                        amount: 100, // Ahora se pasa directo sin parseFloat
                        referenceType: null 
                    })
                })
            );
            expect(result).toHaveProperty('id', 'mov-1');
        });
    });

    // ==========================================
    // 2. TEST DE INTEGRIDAD (UPDATE / DELETE)
    // ==========================================
    describe('Integrity Checks (Update/Delete)', () => {
        
        test('update: falla si el movimiento tiene referenceType (Sistema)', async () => {
            mockPrisma.moneyMovement.findFirst.mockResolvedValue({
                id: 'mov-sys',
                referenceType: 'SALE', 
                amount: mockDecimal(500)
            });

            await expect(moneyService.updateMoneyMovement(mockCompanyId, 'mov-sys', { amount: 600 }))
                .rejects.toThrow(/No puedes editar manualmente/); 
            
            expect(mockPrisma.moneyMovement.update).not.toHaveBeenCalled();
        });

        test('update: permite editar un movimiento puramente MANUAL (referenceType: null)', async () => {
            // [CORRECCIÓN] referenceType debe ser NULL para permitir edición
            mockPrisma.moneyMovement.findFirst.mockResolvedValue({
                id: 'mov-man',
                referenceType: null, 
                amount: mockDecimal(100)
            });

            mockPrisma.moneyMovement.update.mockResolvedValue({ id: 'mov-man', amount: mockDecimal(150) });

            await moneyService.updateMoneyMovement(mockCompanyId, 'mov-man', { amount: 150 });

            expect(mockPrisma.moneyMovement.update).toHaveBeenCalled();
        });

        test('delete: falla si el movimiento tiene referenceType', async () => {
            mockPrisma.moneyMovement.findFirst.mockResolvedValue({
                id: 'mov-pur',
                referenceType: 'PURCHASE'
            });

            await expect(moneyService.deleteMoneyMovement(mockCompanyId, 'mov-pur'))
                .rejects.toThrow(/Debes anular la Venta\/Compra/);
            
            expect(mockPrisma.moneyMovement.delete).not.toHaveBeenCalled();
        });
    });

    // ==========================================
    // 3. TEST DE REPORTES (Con Mock Decimal)
    // ==========================================
    describe('getMoneyMovementsReport', () => {
        test('calcula totales y agrupa categorías correctamente usando tipos Decimal', async () => {
            // --- MOCKS USANDO mockDecimal ---
            
            // 1. Totales Generales
            mockPrisma.moneyMovement.aggregate
                .mockResolvedValueOnce({ _sum: { amount: mockDecimal(1000) } }) // IN
                .mockResolvedValueOnce({ _sum: { amount: mockDecimal(250) } }); // OUT

            // 2. Métodos de Pago
            mockPrisma.moneyMovement.groupBy.mockResolvedValueOnce([
                { paymentMethod: 'CASH', type: 'IN', _sum: { amount: mockDecimal(1000) }, _count: 5 }
            ]);

            // 3. Categorías
            mockPrisma.moneyMovement.groupBy.mockResolvedValueOnce([
                { categoryId: 'cat-1', type: 'IN', _sum: { amount: mockDecimal(1000) } },
                { categoryId: 'cat-1', type: 'OUT', _sum: { amount: mockDecimal(200) } },
            ]);

            // 4. Nombres
            mockPrisma.moneyCategory.findMany.mockResolvedValue([
                { id: 'cat-1', name: 'Ventas' }
            ]);

            // --- EJECUCIÓN ---
            const report = await moneyService.getMoneyMovementsReport(mockCompanyId, {});

            // --- VALIDACIONES ---
            // Validamos que .toNumber() funcionó y devolvió primitivos
            expect(report.summary.totalIn).toBe(1000); 
            expect(report.summary.totalOut).toBe(250);
            expect(report.summary.balance).toBe(750); // 1000 - 250

            const cat1 = report.byCategory.find(c => c.category.id === 'cat-1');
            expect(cat1.balance).toBe(800); // 1000 - 200
        });

        test('maneja valores nulos (cero movimientos) sin romperse', async () => {
            // Caso donde la DB está vacía y aggregate devuelve null en _sum
            mockPrisma.moneyMovement.aggregate
                .mockResolvedValueOnce({ _sum: { amount: null } }) 
                .mockResolvedValueOnce({ _sum: { amount: null } }); 

            mockPrisma.moneyMovement.groupBy.mockResolvedValue([]); // groupBy vacíos
            mockPrisma.moneyCategory.findMany.mockResolvedValue([]);

            const report = await moneyService.getMoneyMovementsReport(mockCompanyId, {});

            expect(report.summary.totalIn).toBe(0);
            expect(report.summary.totalOut).toBe(0);
        });
    });
});