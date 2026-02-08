import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { RateLimiterMemory } from 'rate-limiter-flexible'; // npm install rate-limiter-flexible

import {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    TooManyRequestsError // Asegúrate de tener este error o usa BadRequestError
} from '../../errors/index.js';

// --- CONFIGURACIÓN RATE LIMITER (Nivel Servicio) ---
// Bloquea el email si falla 5 veces consecutivas en 15 minutos
const maxWrongAttemptsByIPperDay = 5;
const maxConsecutiveFailsByUsernameAndIP = 5;

const limiterSlowBruteByUsername = new RateLimiterMemory({
    points: maxConsecutiveFailsByUsernameAndIP,
    duration: 60 * 15, // 15 minutos de bloqueo
    blockDuration: 60 * 15, // Si se excede, bloquear por 15 min
});

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

export const login = async ({ email, password }) => {
    // 1. RATE LIMIT CHECK (Antes de tocar la DB)
    // Verificamos si este email ya está bloqueado por demasiados intentos fallidos
    const limiterKey = email; // Podrías combinarlo con IP si la pasaras como argumento

    const resUsername = await limiterSlowBruteByUsername.get(limiterKey);

    if (resUsername !== null && resUsername.consumedPoints > maxConsecutiveFailsByUsernameAndIP) {
        const retrySecs = Math.round(resUsername.msBeforeNext / 1000) || 1;
        
        throw TooManyRequestsError(`Demasiados intentos. Intenta de nuevo en ${retrySecs} segundos.`);
    }

    // 2. Búsqueda de Usuario
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            companies: {
                where: { active: true },
                include: { company: true }
            }
        }
    });

    // Nota de seguridad: Si el usuario no existe, consumimos un punto del rate limit 
    // igualmente para evitar "User Enumeration" (timing attacks)
    if (!user || !user.active) {
        try {
            await limiterSlowBruteByUsername.consume(limiterKey);
        } catch (rlRejected) {
            throw new Error('Cuenta bloqueada temporalmente por seguridad');
        }
        throw UnauthorizedError('Credenciales inválidas');
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        // Contraseña incorrecta: Consumimos 1 punto de intento
        try {
            await limiterSlowBruteByUsername.consume(limiterKey);
        } catch (rlRejected) {
            throw new Error('Cuenta bloqueada temporalmente por seguridad');
        }
        throw UnauthorizedError('Credenciales inválidas');
    }

    // SI LLEGAMOS AQUÍ, EL LOGIN FUE EXITOSO
    // Reseteamos el contador de fallos para este usuario
    await limiterSlowBruteByUsername.delete(limiterKey);

    // --- LÓGICA DE LOGIN ORIGINAL ---

    if (user.type === 'PLATFORM') {
        const accessToken = jwt.sign(
            { sub: user.id, type: 'PLATFORM' },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        return {
            accessToken,
            user: { id: user.id, email: user.email, type: 'PLATFORM' },
            mode: 'PLATFORM',
            companies: []
        };
    }

    const availableCompanies = user.companies.map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
        role: uc.role,
        active: uc.active && uc.company.active
    }));

    const identityToken = jwt.sign(
        { sub: user.id, type: 'IDENTITY_PENDING' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );

    return {
        identityToken,
        user: { id: user.id, email: user.email, type: 'COMPANY' },
        mode: 'SELECT_COMPANY',
        companies: availableCompanies
    };
};

export const selectCompany = async ({ identityToken, companyId }) => {
    const decoded = jwt.verify(identityToken, process.env.JWT_SECRET);

    if (decoded.type !== 'IDENTITY_PENDING') {
        throw ForbiddenError('Token de identidad inválido');
    }

    const membership = await prisma.userCompany.findFirst({
        where: {
            userId: decoded.sub,
            companyId: companyId,
            active: true
        }
    });

    if (!membership) {
        throw ForbiddenError('No tienes acceso a esta empresa');
    }

    const accessToken = jwt.sign(
        {
            sub: decoded.sub,
            type: 'COMPANY',
            companyId: companyId,
            role: membership.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    const refreshToken = crypto.randomUUID();

    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: decoded.sub,
            companyId: companyId,
            type: 'COMPANY',
            expiresAt: addDays(new Date(), 7)
        }
    });

    return { accessToken, refreshToken };
};

export const getMe = async (userId, currentCompanyId = null) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            type: true,
            active: true,
            companies: {
                where: { active: true },
                select: {
                    companyId: true,
                    role: true,
                    active: true,
                    company: { select: { name: true, active: true } }
                }
            }
        }
    });

    if (!user || !user.active) throw UnauthorizedError("Usuario inválido");

    return {
        ...user,
        currentCompanyId: currentCompanyId
    };
};

export const register = async ({ email, password }) => {
    if (!email || !password) {
        throw BadRequestError('Datos incompletos');
    }

    // Opcional: Podrías añadir rate limit al registro por IP para evitar spam de cuentas

    const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existing) {
        throw ConflictError('El email ya está registrado');
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
        data: {
            email,
            password: hashed,
            active: true,
            type: 'COMPANY'
        },
        select: {
            id: true,
            email: true,
        },
    });

    return newUser;
};

export const refresh = async (refreshToken) => {
    const token = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
    });

    if (
        !token ||
        token.type !== 'COMPANY' ||
        token.expiresAt < new Date()
    ) {
        throw UnauthorizedError('Refresh inválido');
    }

    // Nota profesional: Aquí sería ideal rotar el refresh token (eliminar el usado, crear uno nuevo)
    // para detectar robo de tokens.

    const accessToken = jwt.sign(
        {
            sub: token.userId,
            type: 'COMPANY',
            companyId: token.companyId,
            // Aquí deberíamos obtener el rol real haciendo una consulta rápida a DB
            // o guardarlo en el refreshToken model si queremos evitar la query.
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    return accessToken;
};

export const logout = async (token) => {
    if (!token) {
        throw BadRequestError('Token no proporcionado');
    }
    await prisma.refreshToken.deleteMany({
        where: {
            token: token,
            type: 'COMPANY'
        }
    });
};

export const forgotPassword = async ({ email }) => {
    if (!email) {
        throw BadRequestError('Email requerido');
    }

    // Rate Limit para evitar spam de correos
    const limiterKey = `forgot_${email}`;
    try {
        await limiterSlowBruteByUsername.consume(limiterKey);
    } catch (e) {
        throw new Error('Demasiadas solicitudes de recuperación. Espera un momento.');
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
    });

    if (!user) {
        return { success: true };
    }

    const resetToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
    );

    console.log('Reset token:', resetToken);
    return { success: true };
};

export const resetPassword = async ({ token, newPassword }) => {
    if (!token || !newPassword) {
        throw BadRequestError('Token y contraseña requeridos');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
        const hashed = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: decoded.userId },
            data: { password: hashed },
        });

        // Limpiamos cualquier bloqueo previo al cambiar la contraseña exitosamente
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) await limiterSlowBruteByUsername.delete(user.email);

        return { success: true };
    } catch (error) {
        throw UnauthorizedError('Token inválido o expirado');
    }
};

export const cleanExpiredTokens = async () => {
    const now = new Date();
    const result = await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: {
                lt: now
            }
        }
    });
    return result.count;
};

export const logoutAllDevices = async (userId) => {
    await prisma.refreshToken.deleteMany({
        where: {
            userId: userId,
            type: 'COMPANY'
        }
    });
};