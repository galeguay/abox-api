import prisma from '../../../prisma/client.js';
import AppError from '../../errors/AppError.js';

// Obtener estadísticas generales del dashboard
export const getDashboardStats = async () => {
  const [
    totalCompanies,
    activeCompanies,
    totalUsers,
    activeUsers,
    totalProducts,
    totalSales,
    totalRevenue,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { active: true } }),
    prisma.user.count({ where: { userType: 'COMPANY' } }),
    prisma.user.count({
      where: { userType: 'COMPANY', active: true },
    }),
    prisma.product.count(),
    prisma.sale.count(),
    prisma.sale.aggregate({
      _sum: { total: true },
    }),
  ]);

  return {
    companies: {
      total: totalCompanies,
      active: activeCompanies,
      inactive: totalCompanies - activeCompanies,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
    },
    products: {
      total: totalProducts,
    },
    sales: {
      total: totalSales,
      revenue: totalRevenue._sum.total || 0,
    },
  };
};

// Obtener compañías con mejor desempeño
export const getTopCompanies = async (limit = 5) => {
  const topCompanies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      active: true,
      _count: {
        select: {
          users: true,
          products: true,
          sales: true,
        },
      },
    },
    orderBy: {
      sales: {
        _count: 'desc',
      },
    },
    take: limit,
  });

  return topCompanies;
};

// Obtener actividad reciente
export const getRecentActivity = async (days = 7, limit = 20) => {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);

  const [recentSales, recentUsers, recentCompanies] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
        },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        company: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.user.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
        },
        userType: 'COMPANY',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.company.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  return {
    sales: recentSales.map((sale) => ({
      type: 'SALE',
      description: `Venta de $${sale.total} en ${sale.company.name}`,
      createdAt: sale.createdAt,
    })),
    users: recentUsers.map((user) => ({
      type: 'USER',
      description: `Nuevo usuario: ${user.firstName} ${user.lastName} (${user.email})`,
      createdAt: user.createdAt,
    })),
    companies: recentCompanies.map((company) => ({
      type: 'COMPANY',
      description: `Nueva compañía: ${company.name}`,
      createdAt: company.createdAt,
    })),
  };
};

// Obtener métricas por período
export const getMetricsByPeriod = async (startDate, endDate) => {
  const sales = await prisma.sale.aggregate({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
    _sum: { total: true },
    _count: true,
    _avg: { total: true },
  });

  const users = await prisma.user.count({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      userType: 'COMPANY',
    },
  });

  const companies = await prisma.company.count({
    where: {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    },
  });

  return {
    period: {
      startDate,
      endDate,
    },
    sales: {
      total: sales._count,
      revenue: sales._sum.total || 0,
      average: sales._avg.total || 0,
    },
    users: {
      new: users,
    },
    companies: {
      new: companies,
    },
  };
};

// Obtener distribución de usuarios por compañía
export const getUserDistribution = async (limit = 10) => {
  const distribution = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      users: {
        _count: 'desc',
      },
    },
    take: limit,
  });

  return distribution.map((company) => ({
    company: company.name,
    users: company._count.users,
  }));
};

// Obtener ventas por compañía
export const getSalesByCompany = async (limit = 10) => {
  const sales = await prisma.sale.groupBy({
    by: ['companyId'],
    _sum: { total: true },
    _count: true,
    orderBy: {
      _sum: { total: 'desc' },
    },
    take: limit,
  });

  // Obtener nombres de compañías
  const companies = await prisma.company.findMany({
    where: {
      id: {
        in: sales.map((s) => s.companyId),
      },
    },
    select: { id: true, name: true },
  });

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  return sales.map((sale) => ({
    company: companyMap.get(sale.companyId),
    revenue: sale._sum.total || 0,
    sales: sale._count,
    averageSaleValue: sale._count > 0 ? (sale._sum.total || 0) / sale._count : 0,
  }));
};

// Obtener resumen ejecutivo
export const getExecutiveSummary = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [todayStats, yesterdayStats, thisMonthStats, lastMonthStats] =
    await Promise.all([
      // Estadísticas de hoy
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: today,
          },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Estadísticas de ayer
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: yesterday,
            lt: today,
          },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Estadísticas de este mes
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
        _sum: { total: true },
        _count: true,
      }),
      // Estadísticas del mes pasado
      prisma.sale.aggregate({
        where: {
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth() - 1, 1),
            lt: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
        _sum: { total: true },
        _count: true,
      }),
    ]);

  const todayRevenue = todayStats._sum.total || 0;
  const yesterdayRevenue = yesterdayStats._sum.total || 0;
  const thisMonthRevenue = thisMonthStats._sum.total || 0;
  const lastMonthRevenue = lastMonthStats._sum.total || 0;

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    today: {
      sales: todayStats._count,
      revenue: todayRevenue,
      growthVsYesterday: calculateGrowth(todayRevenue, yesterdayRevenue),
    },
    thisMonth: {
      sales: thisMonthStats._count,
      revenue: thisMonthRevenue,
      growthVsLastMonth: calculateGrowth(thisMonthRevenue, lastMonthRevenue),
    },
  };
};
