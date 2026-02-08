import prisma from '../../../prisma/client.js';

/**
 * Obtiene el resumen estadístico principal para el dashboard
 * @param {string} companyId 
 * @param {Object} filters - { startDate, endDate, period }
 */
export const getDashboardStats = async (companyId, filters = {}) => {
    let fromDate, toDate;
    const now = new Date();

    // ---------------------------------------------------------
    // 1. LÓGICA DE FECHAS (HÍBRIDA)
    // ---------------------------------------------------------
    
    if (filters.startDate && filters.endDate) {
        // A. Rango Manual (Custom)
        fromDate = new Date(filters.startDate);
        toDate = new Date(filters.endDate);
        
        // Aseguramos que cubra el día completo
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
    } else {
        // B. Periodos Predefinidos (Presets)
        const period = filters.period || 'week'; // Default a semana
        toDate = new Date(); // Hasta el momento actual
        toDate.setHours(23, 59, 59, 999);

        // Clonamos 'now' para calcular el inicio
        fromDate = new Date(now); 

        switch (period) {
            case 'today':
                fromDate.setHours(0, 0, 0, 0);
                break;
            
            case 'week':
                // Calcular el lunes de la semana actual
                const day = now.getDay(); // 0 (Domingo) - 6 (Sábado)
                // Ajuste para que la semana empiece el Lunes (si es Domingo -6, si no día-1)
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                fromDate.setDate(diff);
                fromDate.setHours(0, 0, 0, 0);
                break;
            
            case 'month':
                // Día 1 del mes actual
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                fromDate.setHours(0, 0, 0, 0);
                break;
            
            default: // '7days' o fallback
                fromDate.setDate(now.getDate() - 7);
                fromDate.setHours(0, 0, 0, 0);
        }
    }

    // ---------------------------------------------------------
    // 2. CONSULTAS A LA BASE DE DATOS
    // ---------------------------------------------------------

    const [
        topProfitableProducts,
        cashFlowHistory,
        deadStock,
        salesByCategory,
        periodStats
    ] = await Promise.all([
        // 1. Top Rentabilidad (Histórico/General)
        // Nota: Si quisieras filtrar esto por fecha, necesitarías una tabla de transacciones de items,
        // por ahora mantenemos la vista general de rentabilidad del producto.
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

        // 2. Flujo de caja (Filtrado por Rango)
        prisma.cashDaily.findMany({
            where: {
                companyId,
                date: {
                    gte: fromDate,
                    lte: toDate
                }
            },
            orderBy: { date: 'asc' },
            select: {
                date: true,
                cashIn: true,
                cashOut: true,
                balance: true
            }
        }),

        // 3. Stock sin rotación (Estado actual, no depende del rango)
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

        // 4. Ventas por Categoría (General)
        prisma.salesBySaleCategory.findMany({
            where: { companyId },
            orderBy: { totalSales: 'desc' },
            include: {
                saleCategory: {
                    select: { name: true, color: true } 
                }
            }
        }),

        // 5. KPI de Ventas Totales (Filtrado por Rango exacto)
        // Esto reemplaza al "todayStats" anterior para ser dinámico
        prisma.sale.aggregate({
            where: {
                companyId,
                createdAt: {
                    gte: fromDate,
                    lte: toDate
                },
                status: 'COMPLETED'
            },
            _sum: { total: true },
            _count: { id: true }
        })
    ]);

    // ---------------------------------------------------------
    // 3. RESPUESTA
    // ---------------------------------------------------------

    return {
        meta: {
            period: filters.period || 'custom',
            from: fromDate,
            to: toDate
        },
        kpis: {
            // Renombramos para ser genéricos (puede ser today, week o month)
            totalSales: periodStats._sum.total || 0,
            totalTransactions: periodStats._count.id || 0
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