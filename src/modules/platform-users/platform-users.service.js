import prisma from '../../../prisma/client.js';
import bcrypt from 'bcryptjs';
import createError from 'http-errors';

export const getUsers = async ({ page = 1, limit = 10, search, type }) => {
    const skip = (page - 1) * limit;

    // Construcción del filtro dinámico
    const where = {
        AND: []
    };

    if (search) {
        where.AND.push({
            OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } }
            ]
        });
    }

    if (type) {
        where.AND.push({ type });
    }

    // Ejecutar consulta (Total y Datos) en paralelo
    const [total, users] = await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                active: true,
                type: true,
                createdAt: true,
                // Incluimos info básica de sus empresas para contexto
                companies: {
                    select: {
                        role: true,
                        company: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        data: users,
        meta: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};

export const createUser = async (data) => {
    // Extraemos companyId y role (por defecto EMPLOYEE si es empresa)
    const { firstName, lastName, email, password, type, companyId, role = 'EMPLOYEE' } = data;

    // 1. Verificar email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw createError(409, 'El email ya está registrado');

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Crear usuario (y relación si aplica)
    const newUser = await prisma.user.create({
        data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            type: type, // 'COMPANY' o 'PLATFORM'
            active: true,
            // MAGIA DE PRISMA: Si es COMPANY y viene companyId, creamos la relación aquí mismo
            companies: (type === 'COMPANY' && companyId) ? {
                create: {
                    companyId: companyId,
                    role: role, // 'OWNER', 'ADMIN', 'EMPLOYEE', etc.
                    active: true
                }
            } : undefined
        },
        // Seleccionamos lo que devolvemos (incluyendo empresas para confirmar)
        select: {
            id: true,
            email: true,
            type: true,
            companies: {
                select: {
                    company: { select: { name: true } },
                    role: true
                }
            }
        }
    });

    return newUser;
};