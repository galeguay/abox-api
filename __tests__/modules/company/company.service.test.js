import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js'; // Asegúrate que esta ruta sea correcta

// Mock de AppError para que no dependa de la clase real
jest.unstable_mockModule('../src/errors/AppError.js', () => ({
    __esModule: true,
    default: class AppError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    },
}));

// Import dinámico después de los mocks
const companyService = await import('../../../src/modules/company/company.service.js');

describe('Company Service', () => {
    const mockUserId = 'user-123';
    const mockCompanyId = 'company-999';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    // ==========================================
    // 1. PERFIL DE EMPRESA
    // ==========================================
    describe('getMyCompanyProfile', () => {
        test('debería retornar el perfil aplanado (columnas + config JSON)', async () => {
            // Mockeamos datos que simulan DB + campo JSON
            mockPrisma.userCompany.findFirst.mockResolvedValue({
                role: 'OWNER',
                company: { 
                    id: mockCompanyId, 
                    name: 'Test Co', 
                    active: true,
                    // Simulamos el campo JSON
                    config: {
                        city: 'Buenos Aires',
                        website: 'test.com'
                    }
                },
            });

            const result = await companyService.getMyCompanyProfile(mockUserId);

            // Verificaciones
            expect(result.id).toBe(mockCompanyId);
            expect(result.myRole).toBe('OWNER');
            // TEST CLAVE: Verificar que el JSON se "aplanó"
            expect(result.city).toBe('Buenos Aires'); 
            expect(result.website).toBe('test.com');
            // Verificar que config ya no existe como objeto anidado (opcional, según tu lógica)
        });

        test('debería lanzar error si el usuario no tiene empresa', async () => {
            mockPrisma.userCompany.findFirst.mockResolvedValue(null);

            await expect(companyService.getMyCompanyProfile(mockUserId))
                .rejects.toThrow('No estás asignado a ninguna empresa');
        });
    });

    // ==========================================
    // 2. ACTUALIZACIÓN DE PERFIL
    // ==========================================
    describe('updateMyCompanyProfile', () => {
        test('debería actualizar mezclando config existente con nueva', async () => {
            // 1. Mock Permisos
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'ADMIN' });
            
            // 2. Mock Búsqueda de Config Actual (CRÍTICO: Faltaba en tu test original)
            mockPrisma.company.findUnique.mockResolvedValue({
                config: { theme: 'dark', city: 'Old City' }
            });

            // 3. Mock Update
            mockPrisma.company.update.mockResolvedValue({ 
                id: mockCompanyId, 
                name: 'New Name',
                config: { theme: 'dark', city: 'New City', website: 'new.com' } // Lo que devuelve prisma tras update
            });

            const updateData = { 
                name: 'New Name',
                additionalConfig: { city: 'New City', website: 'new.com' }
            };

            const result = await companyService.updateMyCompanyProfile(mockCompanyId, mockUserId, updateData);

            expect(result.name).toBe('New Name');
            expect(result.city).toBe('New City'); // Viene del aplanado
            
            // Verificar que se llamó a update con la fusión correcta
            expect(mockPrisma.company.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: mockCompanyId },
                data: expect.objectContaining({
                    name: 'New Name',
                    config: {
                        theme: 'dark', // Se mantuvo lo viejo
                        city: 'New City', // Se sobrescribió
                        website: 'new.com' // Se agregó
                    }
                })
            }));
        });

        test('debería fallar si no tiene permisos (EMPLOYEE)', async () => {
            // Mock permisos insuficientes
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'EMPLOYEE' });

            await expect(
                companyService.updateMyCompanyProfile(mockCompanyId, mockUserId, { name: 'X' })
            ).rejects.toThrow('No tienes permisos administrativos');
        });
    });

    // ==========================================
    // 3. ESTADÍSTICAS
    // ==========================================
    describe('getMyCompanyStats', () => {
        test('debería calcular las estadísticas correctamente', async () => {
            // 1. Validar acceso
            mockPrisma.userCompany.findUnique.mockResolvedValue({ userId: mockUserId });

            // 2. Mocks de conteos
            mockPrisma.product.count.mockResolvedValue(100);
            mockPrisma.warehouse.count.mockResolvedValue(2);
            mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { total: 5000 }, _count: 10 });
            mockPrisma.moneyMovement.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
            mockPrisma.order.count.mockResolvedValue(3);

            const stats = await companyService.getMyCompanyStats(mockCompanyId, mockUserId);

            expect(stats.inventory.products).toBe(100);
            expect(stats.activityToday.salesTotal).toBe(5000);
            expect(stats.alerts.pendingOrders).toBe(3);
        });
    });

    // ==========================================
    // 4. SETTINGS (Nuevo, reemplaza a Empleados/Modulos que no existen)
    // ==========================================
    describe('getMyCompanySettings', () => {
        test('debería retornar configuración y zonas de entrega', async () => {
            // Auth
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'ADMIN' });
            
            // Get Config
            mockPrisma.company.findUnique.mockResolvedValue({
                config: { operationalHours: [] }
            });

            // Get Delivery Zones
            mockPrisma.deliveryZone.findMany.mockResolvedValue([
                { id: 'zone1', name: 'Centro', price: 100 }
            ]);

            const result = await companyService.getMyCompanySettings(mockCompanyId, mockUserId);

            expect(result.deliveryZones).toHaveLength(1);
            expect(result.deliveryZones[0].name).toBe('Centro');
            expect(Array.isArray(result.operationalHours)).toBe(true);
        });
    });
});