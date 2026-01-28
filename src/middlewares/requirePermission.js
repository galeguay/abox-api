import createError from 'http-errors';
import prisma from '../../prisma/client.js';

const requirePermission = (permissionName) => {
    return async (req, res, next) => {
        const { userId, companyId } = req;

        const membership = await prisma.userCompany.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId,
                },
            },
            select: {
                role: true,
                active: true,
                company: {
                    select: { active: true }
                }
            },
        });

        if (!membership) {
            throw createError(403, 'No perteneces a esta empresa');
        }

        if (!membership.company.active) {
            throw createError(403, 'Empresa suspendida');
        }

        // Validación de tu nuevo campo active
        if (membership.active === false) {
            throw createError(403, 'Tu usuario ha sido desactivado en esta empresa');
        }

        // Buscamos directamente en la tabla de unión RolePermission
        const permissionRecord = await prisma.rolePermission.findFirst({
            where: {
                role: membership.role,
                permission: {
                    name: permissionName,
                },
            },
            include: {
                permission: {
                    include: {
                        module: true,
                    },
                },
            },
        });

        if (!permissionRecord) {
            throw createError(403, 'No tienes permisos para realizar esta acción');
        }

        // Verificar que el módulo esté activo para la empresa
        const moduleId = permissionRecord.permission.moduleId;

        const companyModule = await prisma.companyModule.findUnique({
            where: {
                companyId_moduleId: {
                    companyId,
                    moduleId,
                },
            },
        });

        if (!companyModule || !companyModule.enabled) {
            throw createError(403, 'El módulo para esta función no está activo en su empresa');
        }

        // Si pasó todo, adelante
        next();
    };
};

export default requirePermission;