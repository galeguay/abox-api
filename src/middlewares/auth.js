import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import prisma from '../../prisma/client.js';

export const authMiddleware = (typeRequired) => async (req, res, next) => {
    const header = req.headers.authorization;

    if (!header) {
        throw createError(401, 'Token requerido');
    }

    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        throw createError(401, 'Token inválido');
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // 1. Validación de tipo de token (Capa de Seguridad 1)
        if (typeRequired && payload.type !== typeRequired) {
            throw createError(403, `Se requiere un token de tipo ${typeRequired}`);
        }

        // 2. Información básica del usuario
        req.user = {
            id: payload.sub || payload.userId,
            type: payload.type,
        };

        // 3. Lógica específica según el contexto del token
        
        // CASO A: Usuario operando dentro de una empresa
        if (payload.type === 'COMPANY') {
            if (!payload.companyId) {
                throw createError(401, 'Contexto de empresa no definido en el token');
            }

            const userCompany = await prisma.userCompany.findUnique({
                where: {
                    userId_companyId: {
                        userId: req.user.id,
                        companyId: payload.companyId,
                    },
                },
                select: {
                    active: true,
                    role: true,
                    company: { select: { active: true } },
                },
            });

            if (!userCompany) throw createError(403, 'No tienes acceso a esta empresa');
            if (!userCompany.company.active) throw createError(403, 'Empresa suspendida');
            if (!userCompany.active) throw createError(403, 'Usuario desactivado en esta empresa');

            // Seteamos el contexto en la request
            req.companyId = payload.companyId;
            req.role = userCompany.role;
        }

        // CASO B: Administrador de Plataforma
        if (payload.type === 'PLATFORM') {
            // Aquí podrías verificar en BD si el usuario sigue siendo SuperAdmin
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { type: true, active: true }
            });

            if (!user || !user.active || user.type !== 'PLATFORM') {
                throw createError(403, 'Acceso de plataforma denegado');
            }
            
            req.role = 'SUPER_ADMIN'; // Rol virtual para simplificar validaciones
        }

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') throw createError(401, 'Sesión expirada');
        if (err.statusCode) throw err;
        throw createError(401, 'Token inválido');
    }
};