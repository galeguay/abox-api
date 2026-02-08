import jwt from 'jsonwebtoken';
import createError from 'http-errors';
import prisma from '../../prisma/client.js';

// Definimos los tipos de tokens válidos que sirven para autenticarse
const VALID_ACCESS_TOKEN_TYPES = ['COMPANY', 'PLATFORM', 'IDENTITY_PENDING'];

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

        // --- MEJORA DE SEGURIDAD Nivel Producción ---
        // 1. Validar que el token sea de un tipo conocido por el sistema.
        // Esto evita que tokens extraños (como un refresh token si fuera JWT, o tokens de email)
        // se usen para acceder a la API.
        if (!VALID_ACCESS_TOKEN_TYPES.includes(payload.type)) {
             throw createError(403, 'Tipo de token no válido para autenticación');
        }
        // ---------------------------------------------

        // 2. Validación estricta si la ruta lo pide (ej: authMiddleware('COMPANY'))
        if (typeRequired && payload.type !== typeRequired) {
            throw createError(403, `Se requiere un token de tipo ${typeRequired}`);
        }

        req.user = {
            id: payload.sub || payload.userId,
            type: payload.type,
        };

        // 3. Hidratación de contexto (Context Hydration)
        
        // CASO: Usuario dentro de una empresa
        if (payload.type === 'COMPANY') {
            
            // 1. VALIDACIÓN PREVIA: Asegurar que el token tenga la ID de la empresa
            if (!payload.companyId) {
                throw createError(403, 'Token corrupto: Falta companyId en el payload');
            }

            // 2. CONVERSIÓN DE TIPOS (Si tus IDs en DB son Enteros)
            const userIdInt = req.user.id;
            const companyIdInt = payload.companyId;

            const userCompany = await prisma.userCompany.findUnique({
                where: {
                    userId_companyId: {
                        userId: userIdInt,       // Usar versión numérica
                        companyId: companyIdInt, // Usar versión numérica
                    },
                },
                select: {
                    active: true,
                    role: true,
                    company: { select: { active: true } },
                },
            });

            // Debug log (borrar en producción)
            if (!userCompany) {
                console.log(`Fallo de Auth Company: User ${userIdInt} en Company ${companyIdInt} no encontrado.`);
            }

            if (!userCompany) throw createError(403, 'No tienes acceso a esta empresa');
            if (!userCompany.company.active) throw createError(403, 'Empresa suspendida');
            if (!userCompany.active) throw createError(403, 'Usuario desactivado en esta empresa');

            req.companyId = companyIdInt; // Guardamos el ID limpio y tipado
            req.role = userCompany.role;
        }

        // CASO: Admin de Plataforma
        if (payload.type === 'PLATFORM') {
             // ... (Tu lógica actual de DB está perfecta aquí) ...
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { type: true, active: true }
            });

            if (!user || !user.active || user.type !== 'PLATFORM') {
                throw createError(403, 'Acceso de plataforma denegado');
            }
            req.role = 'SUPER_ADMIN';
        }

        // CASO: Identity Pending (Login hecho, pero no seleccionó empresa)
        // No requiere lógica extra de DB, simplemente dejamos pasar.
        
        next();
    } catch (err) {
        // Manejo de errores estándar
        if (err.name === 'TokenExpiredError') throw createError(401, 'Sesión expirada');
        if (err.name === 'JsonWebTokenError') throw createError(401, 'Token inválido');
        if (err.statusCode) throw err;
        throw createError(401, 'Error de autenticación');
    }
};