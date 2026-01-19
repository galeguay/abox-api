import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
} from '../../errors/index.js';

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

    const token = jwt.sign(
        {
            userId: user.id,
            companyId,
            role: membership.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );

    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            role: membership.role,
        },
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
