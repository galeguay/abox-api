import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
} from '../../errors/index.js';

const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};

export const login = async ({ email, password }) => {
    // 1. Validación común
    const user = await prisma.user.findUnique({
        where: { email },
        include: {
            // Solo cargamos empresas si NO es plataforma, para optimizar
            companies: {
                where: { active: true },
                include: { company: true }
            }
        }
    });

    if (!user || !user.active) throw UnauthorizedError('Usuario inválido');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw UnauthorizedError('Contraseña incorrecta');

    // 2. RAMIFICACIÓN LIMPIA (Strategy Pattern simple)

    // CASO A: Super Admin (Platform)
    if (user.type === 'PLATFORM') {
        const accessToken = jwt.sign(
            { sub: user.id, type: 'PLATFORM' },
            process.env.JWT_SECRET,
            { expiresIn: '4h' } // Los admins suelen necesitar sesiones más largas
        );

        // Retornamos estructura estandarizada
        return {
            accessToken, // Usamos el mismo nombre de propiedad
            user: { id: user.id, email: user.email, type: 'PLATFORM' },
            mode: 'PLATFORM', // Flag para el frontend
            companies: [] // Array vacío para evitar nulls en frontend
        };
    }

    const availableCompanies = user.companies.map(uc => ({
        id: uc.company.id,
        name: uc.company.name,
        role: uc.role,
        active: uc.active && uc.company.active // Solo mostrar si ambos están activos
    }));

    const identityToken = jwt.sign(
        { sub: user.id, type: 'IDENTITY_PENDING' },
        process.env.JWT_SECRET,
        { expiresIn: '10m' }
    );

    return {
        identityToken, // Token temporal específico de este flujo
        user: { id: user.id, email: user.email, type: 'USER' },
        mode: 'SELECT_COMPANY', // El frontend sabe que debe mostrar el selector
        companies: availableCompanies
    };
};

export const selectCompany = async ({ identityToken, companyId }) => {
    // 1. Verificamos el token temporal
    const decoded = jwt.verify(identityToken, process.env.JWT_SECRET);

    if (decoded.type !== 'IDENTITY_PENDING') {
        throw ForbiddenError('Token de identidad inválido');
    }

    // 2. Verificamos que el usuario realmente pertenezca a esa empresa
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

    // 3. Ahora sí, emitimos el Access Token real con el contexto de la empresa
    const accessToken = jwt.sign(
        {
            sub: decoded.sub,
            type: 'COMPANY',
            companyId: companyId,
            role: membership.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
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

export const register = async ({ email, password }) => {
    if (!email || !password) {
        throw BadRequestError('Datos incompletos');
    }

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

    const accessToken = jwt.sign(
        {
            sub: token.userId,
            type: 'COMPANY',
            companyId: token.companyId,
        },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
    );

    return accessToken;
};


export const logout = async (token) => {
    if (!token) {
        throw BadRequestError('Token no proporcionado');
    }

    // Buscamos y eliminamos el token específico
    // Usamos deleteMany para que no falle si el token ya no existe (idempotencia)
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

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
    });

    if (!user) {
        // No revelar si el usuario existe
        return { success: true };
    }

    // Generar token de recuperación (válido por 1 hora)
    const resetToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_RESET_SECRET,
        { expiresIn: '1h' }
    );

    // TODO: Guardar el token en la BD o enviarlo por email
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
            type: 'COMPANY' // O simplemente quita el type si quieres limpiar todo
        }
    });
};