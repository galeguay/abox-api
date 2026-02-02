import prisma from '../../../prisma/client.js';

/**
 * Obtiene el resumen estadístico principal para el dashboard
 * @param {string} companyId 
 * @param {Object} filters - Filtros opcionales (ej: days)
 */
export const getDashboardStats = async (companyId, filters = {}) => {
    // Lógica dinámica para el rango de fechas (default: 7 días)
    const daysBack = filters.days || 7;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - daysBack);
    // Ajustamos a inicio del día para asegurar consistencia
    dateLimit.setHours(0, 0, 0, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Ejecutamos las consultas en paralelo
    const [
        topProfitableProducts,
        cashFlowHistory,
        deadStock,
        salesByCategory,
        todayStats
    ] = await Promise.all([
        // 1. Top Rentabilidad
        prisma.profitByProduct.findMany({
            where: { companyId },
            orderBy: { profit: 'desc' },
            take: 5,
            include: {
                product: {
                    select: { name: true, sku: true }
                }
            }
        }),

        // 2. Flujo de caja (dinámico según 'days')
        prisma.cashDaily.findMany({
            where: {
                companyId,
                date: { gte: dateLimit }
            },
            orderBy: { date: 'asc' },
            select: {
                date: true,
                cashIn: true,
                cashOut: true,
                balance: true
            }
        }),

        // 3. Stock sin rotación
        prisma.productNoRotation.findMany({
            where: {
                companyId,
                daysIdle: { gte: 30 } 
            },
            take: 10,
            orderBy: { daysIdle: 'desc' },
            include: {
                product: { select: { name: true, sku: true } }
            }
        }),

        // 4. Ventas por Categoría (Canales de venta)
        prisma.salesBySaleCategory.findMany({
            where: { companyId },
            orderBy: { totalSales: 'desc' },
            include: {
                saleCategory: {
                    select: { name: true, color: true } 
                }
            }
        }),

        // 5. KPI Rápido: Ventas del día actual
        prisma.sale.aggregate({
            where: {
                companyId,
                createdAt: { gte: startOfToday },
                status: 'COMPLETED'
            },
            _sum: { total: true },
            _count: { id: true }
        })
    ]);

    return {
        period: {
            days: daysBack,
            since: dateLimit
        },
        kpis: {
            // Manejamos el caso null si no hay ventas hoy
            todaySales: todayStats._sum.total || 0,
            todayTransactions: todayStats._count.id || 0
        },
        charts: {
            cashFlow: cashFlowHistory,
            salesByCategory: salesByCategory
        },
        lists: {
            topProfitable: topProfitableProducts,
            deadStock: deadStock
        }
    };
};