import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';

export const createMoneyMovement = async (companyId, userId, data) => {
    const { type, amount, paymentMethod, categoryId, description, reference, referenceType, referenceId } = data;

    // Validar categoría si se proporciona
    if (categoryId) {
        const category = await prisma.moneyCategory.findFirst({
            where: { id: categoryId, companyId },
        });
        if (!category) {
            throw new AppError('Categoría de dinero no encontrada', 404);
        }
    }

    const movement = await prisma.moneyMovement.create({
        data: {
            companyId,
            type,
            // [MODIFICADO] Se elimina parseFloat para evitar imprecisión. Prisma convierte el string/number a Decimal.
            amount: amount, 
            paymentMethod,
            categoryId: categoryId || null,
            description: description || null,
            referenceType: referenceType || null,
            referenceId: referenceId || null,
            createdById: userId,
        },
        include: {
            category: { select: { id: true, name: true } },
            createdBy: { select: { id: true, email: true } },
        },
    });

    return movement;
};

export const getMoneyMovements = async (companyId, filters) => {
    const { page, limit, type, paymentMethod, categoryId, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        type,
        paymentMethod,
        categoryId,
        ...(startDate || endDate ? {
            createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            },
        } : {}),
    };

    const [movements, total] = await Promise.all([
        prisma.moneyMovement.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                category: { select: { id: true, name: true } },
                createdBy: { select: { id: true, email: true } },
            },
        }),
        prisma.moneyMovement.count({ where })
    ]);

    return {
        data: movements,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    };
};

export const getMoneyMovementsReport = async (companyId, filters = {}) => {
    const { startDate, endDate } = filters;

    // 1. Construir el filtro dinámico (WHERE)
    const where = {
        companyId,
        ...(startDate || endDate ? {
            createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            },
        } : {}),
    };

    // 2. Ejecutar consultas de agregación
    const [totalInResult, totalOutResult, paymentMethodStats, categoryStats] = await Promise.all([
        // A. Total Ingresos
        prisma.moneyMovement.aggregate({
            where: { ...where, type: 'IN' },
            _sum: { amount: true }
        }),
        // B. Total Egresos
        prisma.moneyMovement.aggregate({
            where: { ...where, type: 'OUT' },
            _sum: { amount: true }
        }),
        // C. Agrupado por Método de Pago
        prisma.moneyMovement.groupBy({
            by: ['paymentMethod', 'type'],
            where,
            _sum: { amount: true },
            _count: true
        }),
        // D. Agrupado por Categoría (Solo IDs y sumas)
        prisma.moneyMovement.groupBy({
            by: ['categoryId', 'type'],
            where: {
                ...where,
                categoryId: { not: null } // Ignorar movimientos sin categoría
            },
            _sum: { amount: true },
        })
    ]);

    // 3. Obtener nombres de Categorías
    const categoryIds = [...new Set(categoryStats.map(s => s.categoryId))];
    const categories = await prisma.moneyCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true }
    });

    // 4. Procesamiento y Formateo de Datos

    // [MODIFICADO] Uso de .toNumber() en lugar de parseFloat para los totales
    // Prisma devuelve un objeto Decimal en _sum.amount, o null si no hay registros
    const totalIn = totalInResult._sum.amount?.toNumber() ?? 0;
    const totalOut = totalOutResult._sum.amount?.toNumber() ?? 0;

    // --- Procesar Métodos de Pago ---
    const uniqueMethods = [...new Set(paymentMethodStats.map(s => s.paymentMethod))];
    const byPaymentMethod = uniqueMethods.map(method => {
        const stats = paymentMethodStats.filter(s => s.paymentMethod === method);
        const inStat = stats.find(s => s.type === 'IN');
        const outStat = stats.find(s => s.type === 'OUT');

        // [MODIFICADO] Uso de .toNumber() seguro (con operador ?.)
        const inAmount = inStat?._sum.amount?.toNumber() ?? 0;
        const outAmount = outStat?._sum.amount?.toNumber() ?? 0;

        return {
            paymentMethod: method,
            in: inAmount,
            out: outAmount,
            total: inAmount + outAmount,
            netBalance: inAmount - outAmount,
            transactions: (inStat?._count || 0) + (outStat?._count || 0)
        };
    });

    // --- Procesar Categorías ---
    const byCategory = categories.map(cat => {
        const stats = categoryStats.filter(s => s.categoryId === cat.id);
        const inStat = stats.find(s => s.type === 'IN');
        const outStat = stats.find(s => s.type === 'OUT');

        // [MODIFICADO] Uso de .toNumber() seguro
        const inAmount = inStat?._sum.amount?.toNumber() ?? 0;
        const outAmount = outStat?._sum.amount?.toNumber() ?? 0;

        return {
            category: cat,
            total: inAmount + outAmount,
            in: inAmount,
            out: outAmount,
            balance: inAmount - outAmount
        };
    });

    // 5. Retorno Final
    return {
        summary: {
            totalIn,
            totalOut,
            balance: totalIn - totalOut,
        },
        byPaymentMethod,
        byCategory,
    };
};

export const getMoneyMovementById = async (companyId, movementId) => {
    const movement = await prisma.moneyMovement.findFirst({
        where: { id: movementId, companyId },
        include: {
            category: { select: { id: true, name: true } },
            createdBy: { select: { id: true, email: true } },
        },
    });

    if (!movement) {
        throw new AppError('Movimiento de dinero no encontrado', 404);
    }

    return movement;
};

export const updateMoneyMovement = async (companyId, movementId, data) => {
    const movement = await prisma.moneyMovement.findFirst({
        where: { id: movementId, companyId },
    });

    if (!movement) {
        throw new AppError('Movimiento de dinero no encontrado', 404);
    }

    if (movement.referenceType) {
        throw new AppError(`No puedes editar manualmente un movimiento generado por una ${movement.referenceType}. Debes corregir la operación original.`, 403);
    }

    const updated = await prisma.moneyMovement.update({
        where: { id: movementId },
        data: {
            ...(data.type && { type: data.type }),
            // [MODIFICADO] Se elimina parseFloat.
            ...(data.amount && { amount: data.amount }),
            ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
            ...(data.description !== undefined && { description: data.description }),
        },
        include: {
            category: { select: { id: true, name: true } },
            createdBy: { select: { id: true, email: true } },
        },
    });

    return updated;
};

export const deleteMoneyMovement = async (companyId, movementId) => {
    const movement = await prisma.moneyMovement.findFirst({
        where: { id: movementId, companyId },
    });

    if (!movement) throw new AppError('Movimiento no encontrado', 404);

    if (movement.referenceType) {
        throw new AppError(`No puedes eliminar un movimiento vinculado a una ${movement.referenceType}. Debes anular la Venta/Compra original.`, 403);
    }
    
    await prisma.moneyMovement.delete({ where: { id: movementId } });

    return { message: 'Movimiento eliminado exitosamente' };
};