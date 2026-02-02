import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Solo un ".." para salir de la carpeta __tests__ y entrar a prisma
jest.unstable_mockModule('../prisma/client.js', () => ({
    default: {
        profitByProduct: { findMany: jest.fn() },
        cashDaily: { findMany: jest.fn() },
        productNoRotation: { findMany: jest.fn() },
        salesBySaleCategory: { findMany: jest.fn() },
        sale: { aggregate: jest.fn() },
    },
}));

// Importaciones dinámicas (siempre después del mock)
const { default: prisma } = await import('../../../prisma/client.js');
const dashboardService = await import('../../../src/modules/dashboard/dashboard.service.js'); // Asegúrate que esta ruta apunte a tu src

describe('Dashboard Service', () => {
    const mockCompanyId = 'company-123';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('retorna el resumen estadístico correctamente', async () => {
        // Mocks
        prisma.profitByProduct.findMany.mockResolvedValue([]);
        prisma.cashDaily.findMany.mockResolvedValue([]);
        prisma.productNoRotation.findMany.mockResolvedValue([]);
        prisma.salesBySaleCategory.findMany.mockResolvedValue([]);
        prisma.sale.aggregate.mockResolvedValue({ _sum: { total: 0 }, _count: { id: 0 } });

        const result = await dashboardService.getDashboardStats(mockCompanyId, { days: 7 });

        expect(result).toHaveProperty('period');
        expect(prisma.profitByProduct.findMany).toHaveBeenCalled();
    });
});