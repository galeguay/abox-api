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

export const login = async ({ email, password, companyId }) => {
    if (!email || !password || !companyId) {
        throw BadRequestError('Datos incompletos');
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user || !user.active) {
        throw UnauthorizedError('Credenciales inválidas');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw UnauthorizedError('Credenciales inválidas');
    }

    const membership = await prisma.userCompany.findFirst({
        where: {
            userId: user.id,
            companyId,
        },
    });

    if (!membership) {
        throw ForbiddenError('No pertenece a la empresa');
    }

    const accessToken = jwt.sign(
        {
            sub: user.id,
            type: 'COMPANY',
            companyId,
            role: membership.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
    );

    const refreshToken = crypto.randomUUID();

    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            type: 'COMPANY',
            companyId,
            expiresAt: addDays(new Date(), 14),
        }
    });

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            role: membership.role,
        }
    };

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


export const logout = async (userId) => {
    await prisma.refreshToken.deleteMany({
        where: {
            userId,
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
