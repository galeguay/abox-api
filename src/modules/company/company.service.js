import prisma from '../../../prisma/client.js';
import AppError from '../../errors/AppError.js';

// --- HELPER: Validación de permisos ---
const validateAdminAccess = async (companyId, userId) => {
    const userCompany = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId, companyId } },
        select: { role: true },
    });

    // Validamos contra los roles reales del schema: OWNER o ADMIN 
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
                    active: true,
                    createdAt: true,
                    // Contadores rápidos para el perfil
                    _count: {
                        select: {
                            users: true,
                            products: true,
                            warehouses: true,
                            sales: true, // Agregado [cite: 3]
                        },
                    },
                },
            },
        },
    });

    if (!userCompany) {
        throw new AppError('No estás asignado a ninguna empresa', 404);
    }

    return { ...userCompany.company, myRole: userCompany.role };
};

export const updateMyCompanyProfile = async (companyId, userId, data) => {
    await validateAdminAccess(companyId, userId);

    const company = await prisma.company.update({
        where: { id: companyId },
        data: {
            name: data.name,
            active: data.active,
            // Aquí puedes agregar más campos si modificas el schema (ej. logo, dirección)
        },
    });

    return company;
};

export const updateMyCompanySettings = async (companyId, userId, newSettings) => {
    await validateAdminAccess(companyId, userId);

    return prisma.company.update({
        where: { id: companyId },
        data: { 
            config: newSettings
        }
    });
};

// ==========================================
// 2. DASHBOARD & ESTADÍSTICAS (Mejorado)
// ==========================================

export const getMyCompanyStats = async (companyId, userId) => {
    // Verificamos acceso básico (cualquier empleado puede ver stats, o restringe si prefieres)
    const hasAccess = await prisma.userCompany.findUnique({
        where: { userId_companyId: { userId, companyId } }
    });
    if (!hasAccess) throw new AppError('Acceso denegado', 403);

    // Calcular inicio del día para métricas de "Hoy"
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
        totalProducts,
        totalWarehouses,
        salesToday,
        moneyInToday,
        pendingOrders
    ] = await Promise.all([
        prisma.product.count({ where: { companyId, active: true } }), // Solo activos
        prisma.warehouse.count({ where: { companyId, active: true } }),
        
        // Ventas de hoy (Suma total) [cite: 29, 30]
        prisma.sale.aggregate({
            where: { companyId, createdAt: { gte: startOfDay } },
            _sum: { total: true },
            _count: true
        }),

        // Dinero entrante hoy (Caja) [cite: 18, 20]
        prisma.moneyMovement.aggregate({
            where: { companyId, type: 'IN', createdAt: { gte: startOfDay } },
            _sum: { amount: true }
        }),

        // Pedidos pendientes [cite: 38]
        prisma.order.count({
            where: { companyId, status: 'PENDING' }
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
// 3. GESTIÓN DE EMPLEADOS (Nuevo)
// ==========================================

export const getCompanyEmployees = async (companyId, userId) => {
    await validateAdminAccess(companyId, userId);

    // Obtener lista de usuarios con sus roles 
    const employees = await prisma.userCompany.findMany({
        where: { companyId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    active: true, // [cite: 5]
                    createdAt: true
                    // No devolvemos password
                }
            }
        }
    });

    // Aplanar respuesta para facilitar al frontend
    return employees.map(e => ({
        userId: e.user.id,
        email: e.user.email,
        role: e.role,
        active: e.user.active,
        joinedAt: e.createdAt
    }));
};

export const updateEmployeeRole = async (companyId, targetUserId, newRole, adminId) => {
    const myRole = await validateAdminAccess(companyId, adminId);

    // Regla de negocio: Solo OWNER puede nombrar otros ADMINs o transferir propiedad
    if (newRole === 'OWNER' && myRole !== 'OWNER') {
        throw new AppError('Solo el dueño puede transferir la propiedad', 403);
    }
    
    // Validar que el rol exista en el Enum 
    const validRoles = ['OWNER', 'ADMIN', 'EMPLOYEE', 'READ_ONLY'];
    if (!validRoles.includes(newRole)) {
        throw new AppError('Rol inválido', 400);
    }

    return prisma.userCompany.update({
        where: { userId_companyId: { userId: targetUserId, companyId } },
        data: { role: newRole }
    });
};

export const removeEmployee = async (companyId, targetUserId, adminId) => {
    await validateAdminAccess(companyId, adminId);

    // Evitar auto-eliminación
    if (targetUserId === adminId) {
        throw new AppError('No puedes eliminarte a ti mismo de la empresa', 400);
    }

    return prisma.userCompany.delete({
        where: { userId_companyId: { userId: targetUserId, companyId } }
    });
};

// ==========================================
// 4. MÓDULOS DE EMPRESA (Nuevo)
// ==========================================

export const getCompanyModules = async (companyId) => {
    // Obtener todos los módulos disponibles y ver cuáles tiene la empresa
    const allModules = await prisma.module.findMany({
        where: { active: true } // [cite: 58]
    });

    const activeModules = await prisma.companyModule.findMany({
        where: { companyId, enabled: true } // [cite: 59]
    });

    const enabledIds = new Set(activeModules.map(m => m.moduleId));

    return allModules.map(module => ({
        ...module,
        isEnabled: enabledIds.has(module.id)
    }));
};

export const toggleCompanyModule = async (companyId, moduleId, enable, userId) => {
    await validateAdminAccess(companyId, userId);

    // Upsert: Si existe actualiza, si no crea [cite: 59]
    return prisma.companyModule.upsert({
        where: {
            companyId_moduleId: { companyId, moduleId }
        },
        update: { enabled: enable },
        create: {
            companyId,
            moduleId,
            enabled: enable
        }
    });
};

// ==========================================
// 5. SETTINGS (Simulado / Híbrido)
// ==========================================

export const getMyCompanySettings = async (companyId, userId) => {
    await validateAdminAccess(companyId, userId);

    // Obtenemos zonas de entrega reales de la DB [cite: 28]
    const deliveryZones = await prisma.deliveryZone.findMany({
        where: { companyId, active: true }
    });

    // Mock de configuraciones que aún no tienen tabla
    return {
        operationalHours: [ /* Tu JSON estático anterior */ ],
        policies: {
            maxDiscountPercentage: 10,
            defaultTaxRate: 19,
        },
        deliveryZones: deliveryZones // Dato real mezclado con config
    };
};