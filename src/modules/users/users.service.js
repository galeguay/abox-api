import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import AppError from '../../errors/AppError.js';
import { logAction } from '../../platform/audit/platform.audit.service.js';
import { ROLES } from '../../constants/rols.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from '../../constants/audit.constants.js';

const USER_SELECT = {
    id: true,
    email: true,
    active: true,
    createdAt: true,
};

// ==================== MI PERFIL ====================

// Obtener mi perfil
export const getMyProfile = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            active: true,
            createdAt: true,
            updatedAt: true,
            companies: {
                where: { active: true }, // Solo mostrar empresas donde estoy activo localmente
                select: {
                    role: true,
                    active: true, // Ver mi estado en esa empresa
                    company: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        throw new AppError('Usuario no encontrado', 404);
    }

    return user;
};

// Actualizar mi perfil
export const updateMyProfile = async (userId, data) => {
    const { firstName, lastName } = data;

    const updated = await prisma.user.update({
        where: { id: userId },
        data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            active: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return updated;
};

// Cambiar mi contraseña
export const changeMyPassword = async (userId, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true },
    });

    if (!user) {
        throw new AppError('Usuario no encontrado', 404);
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
        throw new AppError('Contraseña actual incorrecta', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    logAction({
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        resource: AUDIT_RESOURCES.USER_PASSWORD,
        resourceId: userId,
        details: { action: 'Cambio de contraseña' },
        status: 'SUCCESS',
    });

    return { message: 'Contraseña actualizada correctamente' };
};

// Ver mis empresas
export const getMyCompanies = async (userId) => {
    const companies = await prisma.userCompany.findMany({
        where: {
            userId,
            active: true // Solo devolver empresas donde no estoy bloqueado
        },
        select: {
            id: true,
            role: true,
            company: {
                select: {
                    id: true,
                    name: true,
                    active: true,
                    createdAt: true,
                },
            },
        },
        orderBy: { company: { name: 'asc' } },
    });

    return companies;
};

// Cambiar empresa activa
export const switchActiveCompany = async (userId, companyId) => {
    const userCompany = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId,
                companyId,
            },
        },
        include: { company: true }
    });

    if (!userCompany) {
        throw new AppError('No tienes acceso a esta compañía', 403);
    }

    // VALIDACIÓN NUEVA: Chequear bloqueo local
    if (!userCompany.active) {
        throw new AppError('Tu usuario está desactivado en esta compañía', 403);
    }

    if (!userCompany.company.active) {
        throw new AppError('La compañía se encuentra suspendida', 403);
    }

    logAction({
        userId,
        action: AUDIT_ACTIONS.UPDATE,
        resource: AUDIT_RESOURCES.ACTIVE_COMPANY,
        resourceId: companyId,
        details: { action: 'Cambio de empresa activa' },
        status: 'SUCCESS',
    });

    return { message: 'Empresa activa cambiada', role: userCompany.role };
};

// Ver mis permisos/roles en todas mis empresas
export const getMyPermissions = async (userId) => {
    const companies = await prisma.userCompany.findMany({
        where: { userId, active: true },
        select: {
            company: {
                select: {
                    id: true,
                    name: true,
                },
            },
            role: true,
        },
    });

    return companies.map((uc) => ({
        companyId: uc.company.id,
        companyName: uc.company.name,
        role: uc.role,
    }));
};

// ==================== GESTIÓN DE USUARIOS EN EMPRESA ====================

// Listar usuarios de la empresa (Con Búsqueda y Filtros)
export const getCompanyUsers = async (companyId, page = 1, limit = 10, filters = {}) => {
    const { role, search } = filters;
    const skip = (page - 1) * limit;

    const where = { companyId };

    if (role) where.role = role;

    // NUEVO: Lógica de búsqueda
    if (search) {
        where.user = {
            OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ],
        };
    }

    const [users, total] = await Promise.all([
        prisma.userCompany.findMany({
            where,
            skip,
            take: limit,
            select: {
                id: true,
                role: true,
                active: true, // Importante: estado local
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        active: true, // Estado global
                        createdAt: true,
                    },
                },
            },
            orderBy: { user: { createdAt: 'desc' } },
        }),
        prisma.userCompany.count({ where }),
    ]);

    return {
        data: users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

// Obtener un usuario específico de la empresa
export const getCompanyUserById = async (companyId, userId) => {
    const userCompany = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId,
                companyId,
            },
        },
        select: {
            id: true,
            role: true,
            active: true, // Estado local
            user: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    active: true, // Estado global
                    createdAt: true,
                    updatedAt: true,
                },
            },
        },
    });

    if (!userCompany) {
        throw new AppError('Usuario no encontrado en esta compañía', 404);
    }

    return userCompany;
};

export const inviteUserToCompany = async (companyId, email, role, invitedBy) => {
    const validRoles = getAvailableRoles().map(r => r.name);
    if (!validRoles.includes(role)) {
        throw new AppError('Rol inválido', 400);
    }

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true }
    });

    if (!company) {
        throw new AppError('Compañía no encontrada', 404);
    }

    // Variables para manejar el envío del email fuera de la transacción
    let emailData = null;

    const result = await prisma.$transaction(async (tx) => {
        let user = await tx.user.findUnique({
            where: { email },
        });

        // CASO 1: El usuario NO existe (Es nuevo)
        if (!user) {
            // Generamos un token seguro de 32 bytes
            const token = crypto.randomBytes(32).toString('hex');
            const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas de validez

            // Generamos una contraseña aleatoria compleja que NADIE conocerá
            const dummyPassword = crypto.randomBytes(20).toString('hex');
            const hashedPassword = await bcrypt.hash(dummyPassword, 10);

            user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: email.split('@')[0], // Placeholder
                    lastName: '',
                    userType: 'COMPANY',
                    invitationToken: token,
                    invitationExpires: tokenExpires,
                },
            });

            emailData = {
                type: 'NEW_USER_INVITE',
                email,
                token, 
                companyName: company.name
            };
        }
        // CASO 2: El usuario YA existe
        else {
            emailData = {
                type: 'EXISTING_USER_ADDED',
                email,
                companyName: company.name
            };
        }

        // Verificamos si ya está en la empresa
        const existingUserCompany = await tx.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId: user.id,
                    companyId,
                },
            },
        });

        if (existingUserCompany) {
            throw new AppError('El usuario ya existe en esta compañía', 400);
        }

        // Creamos la relación
        const userCompany = await tx.userCompany.create({
            data: {
                userId: user.id,
                companyId,
                role,
                active: true,
            },
            select: {
                id: true,
                role: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        return userCompany;
    });

    // Envío del Email (Fuera de la transacción para no bloquear)
    if (emailData && emailData.type === 'NEW_USER_INVITE') {
        // AQUÍ implementaremos el email real en el siguiente paso
        console.log(`[EMAIL] Link de invitación para ${emailData.email}: /setup-password?token=${emailData.token}`);
    }

    logAction({
        userId: invitedBy,
        action: AUDIT_ACTIONS.CREATE,
        resource: AUDIT_RESOURCES.COMPANY_USER,
        resourceId: result.user.id,
        details: {
            email,
            role,
            companyId,
            invitationType: emailData?.type
        },
        status: 'SUCCESS',
    });

    return result;
};

export const completeInvitation = async (token, newPassword) => {
    // 1. Buscamos al usuario por el token
    const user = await prisma.user.findUnique({
        where: { invitationToken: token },
    });

    if (!user) {
        throw new AppError('Token de invitación inválido o inexistente', 400);
    }

    // 2. Verificamos si el token ha expirado
    if (user.invitationExpires && user.invitationExpires < new Date()) {
        throw new AppError('El enlace de invitación ha caducado. Solicita uno nuevo.', 400);
    }

    // 3. Hasheamos la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Actualizamos el usuario y limpiamos el token (para que no se pueda reusar)
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            invitationToken: null,
            invitationExpires: null,
            active: true,
        },
    });

    return { message: 'Cuenta configurada exitosamente. Ya puedes iniciar sesión.' };
};

// Cambiar rol de usuario en empresa
export const changeUserRole = async (companyId, userId, newRole, changedBy) => {
    // Validar Rol
    const validRoles = getAvailableRoles().map(r => r.name);
    if (!validRoles.includes(newRole)) {
        throw new AppError('Rol inválido', 400);
    }

    const userCompany = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId,
                companyId,
            },
        },
    });

    if (!userCompany) {
        throw new AppError('Usuario no encontrado en esta compañía', 404);
    }

    const oldRole = userCompany.role;

    const updated = await prisma.userCompany.update({
        where: { id: userCompany.id },
        data: { role: newRole },
        select: {
            id: true,
            role: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                },
            },
        },
    });

    logAction({
        userId: changedBy,
        action: AUDIT_ACTIONS.UPDATE,
        resource: AUDIT_RESOURCES.COMPANY_USER_ROLE,
        resourceId: userId,
        details: {
            companyId,
            oldRole,
            newRole,
        },
        status: 'SUCCESS',
    });

    return updated;
};

// Desactivar usuario en empresa
export const deactivateUserInCompany = async (companyId, userId, deactivatedBy) => {
    const userCompany = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId,
                companyId,
            },
        },
    });

    if (!userCompany) {
        throw new AppError('Usuario no encontrado en esta compañía', 404);
    }

    const updated = await prisma.userCompany.update({
        where: { id: userCompany.id },
        data: { active: false }, 
        select: {
            id: true,
            active: true,
            userId: true
        },
    });

    logAction({
        userId: deactivatedBy,
        action: AUDIT_ACTIONS.UPDATE,
        resource: AUDIT_RESOURCES.COMPANY_USER_DEACTIVATE,
        resourceId: userId,
        details: {
            companyId,
            action: 'Usuario desactivado localmente',
        },
        status: 'SUCCESS',
    });

    return updated;
};

// Activar usuario en empresa
export const activateUserInCompany = async (companyId, userId, activatedBy) => {
    const userCompany = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId,
                companyId,
            },
        },
    });

    if (!userCompany) {
        throw new AppError('Usuario no encontrado en esta compañía', 404);
    }

    const updated = await prisma.userCompany.update({
        where: { id: userCompany.id },
        data: { active: true },
        select: {
            id: true,
            active: true,
            userId: true
        },
    });

    logAction({
        userId: activatedBy,
        action: AUDIT_ACTIONS.UPDATE,
        resource: AUDIT_RESOURCES.COMPANY_USER_ACTIVATE,
        resourceId: userId,
        details: {
            companyId,
            action: 'Usuario reactivado localmente',
        },
        status: 'SUCCESS',
    });

    return updated;
};

// Remover usuario de empresa
export const removeUserFromCompany = async (companyId, userId, removedBy) => {
    const userCompany = await prisma.userCompany.findUnique({
        where: {
            userId_companyId: {
                userId,
                companyId,
            },
        },
    });

    if (!userCompany) {
        throw new AppError('Usuario no encontrado en esta compañía', 404);
    }

    await prisma.userCompany.delete({
        where: { id: userCompany.id },
    });

    logAction({
        userId: removedBy,
        action: AUDIT_ACTIONS.DELETE,
        resource: AUDIT_RESOURCES.COMPANY_USER,
        resourceId: userId,
        details: {
            companyId,
            email: (await prisma.user.findUnique({ where: { id: userId } }))?.email,
        },
        status: 'SUCCESS',
    });

    return { message: 'Usuario removido de la compañía correctamente' };
};

// ==================== ROLES Y PERMISOS ====================

export const getAvailableRoles = () => {
    return [
        {
            name: ROLES.OWNER,
            description: 'Dueño de la empresa',
            permissions: ['ALL'],
        },
        {
            name: ROLES.ADMIN,
            description: 'Acceso completo a la empresa',
            permissions: ['manage_users', 'manage_settings'],
        },
        {
            name: ROLES.MANAGER,
            description: 'Gestión de operaciones',
            permissions: ['manage_products', 'manage_sales'],
        },
        {
            name: ROLES.EMPLOYEE,
            description: 'Usuario operativo',
            permissions: ['view_products', 'manage_sales'],
        },
        {
            name: ROLES.READ_ONLY,
            description: 'Solo lectura',
            permissions: ['view_products', 'view_reports'],
        },
    ];
};

// Obtener permisos de un rol
export const getRolePermissions = (role) => {
    const roles = getAvailableRoles();
    return roles.find((r) => r.name === role) || null;
};

// ==================== MÉTODOS HEREDADOS (ADMIN PLATAFORMA) ====================

const getById = async (id) => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: USER_SELECT,
    });

    if (!user) {
        throw new AppError('Usuario no encontrado', 404);
    }

    return user;
};

const getAll = async (page = 1, limit = 10, search = '') => {
    const skip = (page - 1) * limit;

    const where = search
        ? {
            OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
            ]
        }
        : {};

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            select: USER_SELECT,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
    ]);

    return {
        data: users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

const updateUser = async (id, data) => {
    const payload = {};

    if (data.email) payload.email = data.email;
    if (typeof data.active === 'boolean') payload.active = data.active;

    return prisma.user.update({
        where: { id },
        data: payload,
        select: USER_SELECT,
    });
};

const changePassword = async (id, currentPassword, newPassword) => {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id },
        data: { password: hash },
    });
};

const setActive = async (id, active) => {
    await prisma.user.update({
        where: { id },
        data: { active },
    });
};

export default {
    getById,
    getAll,
    updateUser,
    changePassword,
    setActive,
};