import prisma from '../../../prisma/client.js';
import AppError from '../../errors/AppError.js';

// --- HELPER: Validación de permisos ---
const validateAdminAccess = async (companyId, userId) => {
    const userCompany = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId, companyId } },
        select: { role: true },
    });

    if (!userCompany || !['OWNER', 'ADMIN'].includes(userCompany.role)) {
        throw new AppError('No tienes permisos administrativos en esta empresa', 403);
    }
    return userCompany.role;
};

// ==========================================
// 1. PERFIL DE EMPRESA
// ==========================================

export const getMyCompanyProfile = async (userId) => {
    const userCompany = await prisma.userCompany.findFirst({
        where: { userId },
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    taxId: true,   // Columna real en DB [cite: 2]
                    email: true,
                    phone: true,   // Columna real en DB [cite: 3]
                    address: true, // Columna real en DB
                    logoUrl: true,
                    active: true,
                    config: true,  // Campo JSON para extras [cite: 5]
                    createdAt: true,
                    _count: {
                        select: {
                            users: true,
                            products: true,
                            warehouses: true,
                            sales: true,
                        },
                    },
                },
            },
        },
    });

    if (!userCompany) {
        throw new AppError('No estás asignado a ninguna empresa', 404);
    }

    const { config, ...companyData } = userCompany.company;

    // Parseamos config si es string (por seguridad), aunque Prisma suele devolver objeto
    const parsedConfig = (config && typeof config === 'object') ? config : {};

    // Retornamos objeto plano: los datos de config (city, country...) al mismo nivel que name
    return {
        ...parsedConfig,
        ...companyData,
        myRole: userCompany.role
    };
};

export const updateMyCompanyProfile = async (companyId, userId, data) => {
    await validateAdminAccess(companyId, userId);

    // 1. Obtener config actual para no perder settings (horarios, policies, etc.)
    const currentCompany = await prisma.company.findUnique({
        where: { id: companyId },
        select: { config: true }
    });

    const currentConfig = (currentCompany?.config && typeof currentCompany.config === 'object')
        ? currentCompany.config
        : {};

    // 2. Update separando columnas físicas vs campo JSON
    const company = await prisma.company.update({
        where: { id: companyId },
        data: {
            // --- Columnas Físicas (Schema) ---
            name: data.name,
            taxId: data.taxId,     // [cite: 2]
            email: data.email,
            phone: data.phone,     // [cite: 3]
            address: data.address,
            logoUrl: data.logoUrl,

            // --- Campo JSON (Config) ---
            config: {
                ...currentConfig,        // Mantiene lo que ya existía
                ...data.additionalConfig // Sobrescribe/Agrega description, city, country, etc.
            }
        },
    });

    // Devolvemos aplanado para consistencia
    const { config, ...updatedData } = company;
    return { ...updatedData, ...(config || {}) };
};

export const updateMyCompanySettings = async (companyId, userId, newSettings) => {
    await validateAdminAccess(companyId, userId);

    const currentCompany = await prisma.company.findUnique({
        where: { id: companyId },
        select: { config: true }
    });

    const currentConfig = (currentCompany?.config && typeof currentCompany.config === 'object')
        ? currentCompany.config
        : {};

    // Limpiamos undefineds
    const cleanNewSettings = Object.fromEntries(
        Object.entries(newSettings).filter(([_, v]) => v !== undefined)
    );

    const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
            config: {
                ...currentConfig,
                ...cleanNewSettings
            }
        }
    });

    return updatedCompany.config;
};

// ==========================================
// 2. DASHBOARD & ESTADÍSTICAS
// ==========================================

export const getMyCompanyStats = async (companyId, userId) => {
    // Verificamos acceso (cualquier rol sirve para ver stats básicas, o restringir si prefieres)
    const hasAccess = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId, companyId } }
    });
    if (!hasAccess) throw new AppError('Acceso denegado', 403);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
        totalProducts,
        totalWarehouses,
        salesToday,
        moneyInToday,
        pendingOrders
    ] = await Promise.all([
        prisma.product.count({ where: { companyId, active: true } }),   // [cite: 11]
        prisma.warehouse.count({ where: { companyId, active: true } }), // [cite: 17]
        prisma.sale.aggregate({
            where: { companyId, createdAt: { gte: startOfDay }, status: 'COMPLETED' }, // Filtramos completas
            _sum: { total: true },
            _count: true
        }),
        prisma.moneyMovement.aggregate({
            where: { companyId, type: 'IN', createdAt: { gte: startOfDay } }, // [cite: 24, 25]
            _sum: { amount: true }
        }),
        prisma.order.count({
            where: { companyId, status: 'PENDING' } // [cite: 46]
        })
    ]);

    return {
        inventory: {
            products: totalProducts,
            warehouses: totalWarehouses,
        },
        activityToday: {
            salesCount: salesToday._count,
            salesTotal: salesToday._sum.total || 0,
            moneyIn: moneyInToday._sum.amount || 0,
        },
        alerts: {
            pendingOrders,
        }
    };
};

// ==========================================
// 3. SETTINGS
// ==========================================

export const getMyCompanySettings = async (companyId, userId) => {
    await validateAdminAccess(companyId, userId);

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { config: true }
    });

    const config = (company?.config && typeof company.config === 'object') ? company.config : {};

    const deliveryZones = await prisma.deliveryZone.findMany({
        where: { companyId, active: true } // [cite: 34]
    });

    return {
        operationalHours: config.operationalHours || [],
        internalPolicies: config.internalPolicies || {},
        deliveryZones
    };
};