import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

// Importamos el servicio
const moneyService = await import('../../../src/modules/money-movements/money-movements.service.js');

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

            // Mock validar categoría
            mockPrisma.moneyCategory.findFirst.mockResolvedValue({ id: 'cat-1' });
            // Mock crear movimiento
            mockPrisma.moneyMovement.create.mockResolvedValue({ id: 'mov-1', ...data });

            const result = await moneyService.createMoneyMovement(mockCompanyId, mockUserId, data);

            expect(mockPrisma.moneyCategory.findFirst).toHaveBeenCalled();
            expect(mockPrisma.moneyMovement.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        type: 'OUT',
                        amount: 100,
                        referenceType: null // Es manual
                    })
                })
            );
            expect(result).toHaveProperty('id', 'mov-1');
        });

        test('falla si la categoría no existe', async () => {
            const data = { categoryId: 'cat-fake', amount: 50 };
            
            mockPrisma.moneyCategory.findFirst.mockResolvedValue(null); // No existe

            await expect(moneyService.createMoneyMovement(mockCompanyId, mockUserId, data))
                .rejects.toThrow('Categoría de dinero no encontrada');
        });
    });

    // ==========================================
    // 2. TEST DE INTEGRIDAD (UPDATE / DELETE)
    // ==========================================
    describe('Integrity Checks (Update/Delete)', () => {
        
        test('update: falla si se intenta editar un movimiento de VENTA (Sistema)', async () => {
            // Simulamos encontrar un movimiento que vino de una Venta
            mockPrisma.moneyMovement.findFirst.mockResolvedValue({
                id: 'mov-sys',
                referenceType: 'SALE', // <--- ESTO ES LA CLAVE
                amount: 500
            });

            await expect(moneyService.updateMoneyMovement(mockCompanyId, 'mov-sys', { amount: 600 }))
                .rejects.toThrow('No puedes editar manualmente'); // Verifica tu mensaje de error
            
            expect(mockPrisma.moneyMovement.update).not.toHaveBeenCalled();
        });

        test('update: permite editar un movimiento MANUAL u OTHER', async () => {
            // Simulamos movimiento manual
            mockPrisma.moneyMovement.findFirst.mockResolvedValue({
                id: 'mov-man',
                referenceType: 'OTHER', // O null
                amount: 100
            });

            mockPrisma.moneyMovement.update.mockResolvedValue({ id: 'mov-man', amount: 150 });

            await moneyService.updateMoneyMovement(mockCompanyId, 'mov-man', { amount: 150 });

            expect(mockPrisma.moneyMovement.update).toHaveBeenCalled();
        });

        test('delete: falla si se intenta borrar un movimiento de COMPRA (Sistema)', async () => {
            mockPrisma.moneyMovement.findFirst.mockResolvedValue({
                id: 'mov-pur',
                referenceType: 'PURCHASE' // <--- Protegido
            });

            await expect(moneyService.deleteMoneyMovement(mockCompanyId, 'mov-pur'))
                .rejects.toThrow('Debes anular la Venta/Compra original');
            
            expect(mockPrisma.moneyMovement.delete).not.toHaveBeenCalled();
        });
    });
// ==========================================
    // 3. TEST DE REPORTES (Optimizado)
    // ==========================================
    describe('getMoneyMovementsReport', () => {
        test('calcula totales y agrupa categorías correctamente', async () => {
            // --- MOCKS ---

            // 1. Mock de Totales Generales (aggregate)
            // El servicio llama primero a IN y luego a OUT
            mockPrisma.moneyMovement.aggregate
                .mockResolvedValueOnce({ _sum: { amount: 1000 } }) // IN
                .mockResolvedValueOnce({ _sum: { amount: 250 } }); // OUT

            // 2. Mock de Métodos de Pago (groupBy) - PRIMERA llamada a groupBy en el servicio
            mockPrisma.moneyMovement.groupBy.mockResolvedValueOnce([
                { paymentMethod: 'CASH', type: 'IN', _sum: { amount: 1000 }, _count: 5 }
            ]);

            // 3. Mock de Categorías (groupBy) - SEGUNDA llamada a groupBy en el servicio
            mockPrisma.moneyMovement.groupBy.mockResolvedValueOnce([
                { categoryId: 'cat-1', type: 'IN', _sum: { amount: 1000 } },
                { categoryId: 'cat-1', type: 'OUT', _sum: { amount: 200 } },
                { categoryId: 'cat-2', type: 'OUT', _sum: { amount: 50 } }
            ]);

            // 4. Mock de Nombres de Categoría (findMany)
            mockPrisma.moneyCategory.findMany.mockResolvedValue([
                { id: 'cat-1', name: 'Ventas' },
                { id: 'cat-2', name: 'Gastos' }
            ]);

            // --- EJECUCIÓN ---
            const report = await moneyService.getMoneyMovementsReport(mockCompanyId, {});

            // --- VALIDACIONES ---
            
            // 1. Validar agrupación por categoría
            const cat1Result = report.byCategory.find(c => c.category.id === 'cat-1');
            expect(cat1Result).toBeDefined();
            expect(cat1Result.in).toBe(1000);
            expect(cat1Result.out).toBe(200);
            
            // 2. Validar totales generales
            expect(report.summary.totalIn).toBe(1000);

            // 3. Validar que se llamó a groupBy 2 veces
            expect(mockPrisma.moneyMovement.groupBy).toHaveBeenCalledTimes(2); 
        });
    });
});