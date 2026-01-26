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

        if (typeRequired && payload.type !== typeRequired) {
            throw createError(403, 'No autorizado');
        }

        req.user = {
            id: payload.sub || payload.userId,
            type: payload.type,
        };

        if (payload.type === 'COMPANY') {
            if (!payload.companyId) {
                throw createError(401, 'Empresa no definida');
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
                    company: {
                        select: { active: true },
                    },
                },
            });

            if (!userCompany) {
                throw createError(403, 'No tienes acceso a esta empresa');
            }

            if (!userCompany.company.active) {
                throw createError(403, 'Empresa suspendida');
            }

            if (!userCompany.active) {
                throw createError(403, 'Tu usuario ha sido desactivado en esta empresa');
            }

            req.companyId = payload.companyId;

            req.role = userCompany.role;
        }

        next();
    } catch (err) {
        if (err.statusCode) {
            throw err;
        }
        throw createError(401, 'Token inválido o expirado');
    }
};

export default authMiddleware;