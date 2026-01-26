import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { mockPrisma } from '../../mocks/prisma.js';

jest.unstable_mockModule('../src/errors/AppError.js', () => ({
    __esModule: true,
    default: class AppError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    },
}));

const companyService = await import('../../../src/modules/company/company.service.js');

describe('Company Service', () => {
    const mockUserId = 'user-123';
    const mockCompanyId = 'company-999';
    const mockAdminRole = { role: 'ADMIN' };

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
        test('debería retornar el perfil de la empresa y mi rol', async () => {
            mockPrisma.userCompany.findFirst.mockResolvedValue({
                role: 'OWNER',
                company: { id: mockCompanyId, name: 'Test Co', active: true },
            });

            const result = await companyService.getMyCompanyProfile(mockUserId);

            expect(result.id).toBe(mockCompanyId);
            expect(result.myRole).toBe('OWNER');
            expect(mockPrisma.userCompany.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId: mockUserId } })
            );
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
        test('debería actualizar si es ADMIN', async () => {
            // Mock validación de permisos
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'ADMIN' });
            // Mock update
            mockPrisma.company.update.mockResolvedValue({ id: mockCompanyId, name: 'New Name' });

            const result = await companyService.updateMyCompanyProfile(mockCompanyId, mockUserId, { name: 'New Name' });

            expect(result.name).toBe('New Name');
            expect(mockPrisma.company.update).toHaveBeenCalled();
        });

        test('debería fallar si no tiene permisos (EMPLOYEE)', async () => {
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'EMPLOYEE' });

            await expect(
                companyService.updateMyCompanyProfile(mockCompanyId, mockUserId, { name: 'X' })
            ).rejects.toThrow('No tienes permisos administrativos');
        });
    });

    // ==========================================
    // 3. ESTADÍSTICAS (Requires mockPrisma extended)
    // ==========================================
    describe('getMyCompanyStats', () => {
        test('debería calcular las estadísticas correctamente', async () => {
            // 1. Validar acceso
            mockPrisma.userCompany.findUnique.mockResolvedValue({ userId: mockUserId });

            // 2. Mocks de conteos y agregaciones
            mockPrisma.product.count.mockResolvedValue(100);
            mockPrisma.warehouse.count.mockResolvedValue(2);
            mockPrisma.sale.aggregate.mockResolvedValue({ _sum: { total: 5000 }, _count: 10 });
            mockPrisma.moneyMovement.aggregate.mockResolvedValue({ _sum: { amount: 2000 } });
            mockPrisma.order.count.mockResolvedValue(3);

            const stats = await companyService.getMyCompanyStats(mockCompanyId, mockUserId);

            expect(stats.inventory.products).toBe(100);
            expect(stats.activityToday.salesTotal).toBe(5000);
            expect(stats.activityToday.moneyIn).toBe(2000);
            expect(stats.alerts.pendingOrders).toBe(3);
        });
    });

    // ==========================================
    // 4. GESTIÓN DE EMPLEADOS
    // ==========================================
    describe('getCompanyEmployees', () => {
        test('debería listar empleados formateados', async () => {
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'ADMIN' }); // Auth

            const rawEmployees = [
                {
                    role: 'MANAGER',
                    createdAt: new Date(),
                    user: { id: 'u2', email: 'test@test.com', active: true }
                }
            ];
            mockPrisma.userCompany.findMany.mockResolvedValue(rawEmployees);

            const result = await companyService.getCompanyEmployees(mockCompanyId, mockUserId);

            expect(result[0].email).toBe('test@test.com');
            expect(result[0].role).toBe('MANAGER');
            expect(result[0].userId).toBe('u2');
        });
    });

    describe('updateEmployeeRole', () => {
        test('debería permitir cambiar rol si es valido', async () => {
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'ADMIN' }); // Auth

            await companyService.updateEmployeeRole(mockCompanyId, 'target-user', 'READ_ONLY', mockUserId);

            expect(mockPrisma.userCompany.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { role: 'READ_ONLY' }
                })
            );
        });

        test('debería impedir nombrar OWNER si no soy OWNER', async () => {
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'ADMIN' }); // Soy Admin, no Owner

            await expect(
                companyService.updateEmployeeRole(mockCompanyId, 'target-user', 'OWNER', mockUserId)
            ).rejects.toThrow('Solo el dueño puede transferir la propiedad');
        });
    });

    // ==========================================
    // 5. MÓDULOS
    // ==========================================
    describe('Modules Management', () => {
        test('getCompanyModules debería marcar isEnabled correctamente', async () => {
            // Todos los módulos del sistema
            mockPrisma.module.findMany.mockResolvedValue([
                { id: 1, code: 'POS' },
                { id: 2, code: 'ECOM' }
            ]);
            // Módulos activos de la empresa
            mockPrisma.companyModule.findMany.mockResolvedValue([
                { moduleId: 1, enabled: true }
            ]);

            const result = await companyService.getCompanyModules(mockCompanyId);

            // POS debería ser true, ECOM false
            expect(result.find(m => m.id === 1).isEnabled).toBe(true);
            expect(result.find(m => m.id === 2).isEnabled).toBe(false);
        });

        test('toggleCompanyModule debería usar upsert', async () => {
            mockPrisma.userCompany.findUnique.mockResolvedValue({ role: 'ADMIN' }); // Auth

            await companyService.toggleCompanyModule(mockCompanyId, 1, true, mockUserId);

            expect(mockPrisma.companyModule.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { companyId_moduleId: { companyId: mockCompanyId, moduleId: 1 } },
                    update: { enabled: true },
                    create: expect.objectContaining({
                        enabled: true,
                    }),
                })
            );
        });
    });
});