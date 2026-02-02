import createError from 'http-errors';
import prisma from '../../prisma/client.js';

const requirePermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            // ---------------------------------------------------------
            // 1. NIVEL DIOS: Bypass para Super Administradores (Platform)
            // ---------------------------------------------------------
            if (req.user && req.user.type === 'PLATFORM') {
                // Los admins de plataforma tienen acceso total implícito
                // o se manejan con otra lógica, pero no deben ser bloqueados por
                // validaciones de empresa.
                return next();
            }

            // ---------------------------------------------------------
            // 2. Validación de Contexto (Usuarios de Empresa)
            // ---------------------------------------------------------
            // CORRECCIÓN: El ID viene dentro del objeto user, no en la raíz de req
            const userId = req.user.id; 
            const { companyId } = req;

            if (!companyId) {
                throw createError(400, 'Contexto de empresa no definido');
            }

            // ---------------------------------------------------------
            // 3. Verificar Membresía y Estado de la Empresa
            // ---------------------------------------------------------
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

            // Validaciones de seguridad básicas
            if (!membership) {
                throw createError(403, 'No perteneces a esta empresa');
            }

            if (!membership.company.active) {
                throw createError(403, 'Esta empresa se encuentra suspendida');
            }

            if (!membership.active) {
                throw createError(403, 'Tu usuario ha sido desactivado en esta empresa');
            }

            // ---------------------------------------------------------
            // 4. Verificar si el ROL tiene el PERMISO solicitado
            // ---------------------------------------------------------
            // Buscamos si existe la relación entre el Rol del usuario y el Permiso solicitado
            const permissionRecord = await prisma.rolePermission.findFirst({
                where: {
                    role: membership.role, // Rol actual del usuario (OWNER, ADMIN, etc.)
                    permission: {
                        name: permissionName, // El string que pasas como argumento, ej: 'CREATE_PRODUCT'
                    },
                },
                include: {
                    permission: {
                        select: { moduleId: true } // Necesitamos saber a qué módulo pertenece
                    },
                },
            });

            if (!permissionRecord) {
                throw createError(403, `No tienes permisos suficientes (${permissionName})`);
            }

            // ---------------------------------------------------------
            // 5. Verificar si la Empresa tiene el MÓDULO contratado/activo
            // ---------------------------------------------------------
            const moduleId = permissionRecord.permission.moduleId;

            const companyModule = await prisma.companyModule.findUnique({
                where: {
                    companyId_moduleId: {
                        companyId,
                        moduleId,
                    },
                },
                select: { enabled: true }
            });

            // Si no existe el registro o enabled es false
            if (!companyModule || !companyModule.enabled) {
                throw createError(403, 'Tu empresa no tiene habilitado el módulo necesario para esta acción');
            }

            // ---------------------------------------------------------
            // 6. Éxito
            // ---------------------------------------------------------
            // Opcional: Inyectar datos útiles para el controlador
            req.role = membership.role;
            
            next();

        } catch (error) {
            // Si es un error de http-errors lo pasamos, si es de Prisma lo envolvemos
            next(error);
        }
    };
};

export default requirePermission;