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
            amount: parseFloat(amount),
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

export const getMoneyMovementsReport = async (companyId, filters = {}) => {
    const { startDate, endDate } = filters;

    const where = {
        companyId,
        ...(startDate || endDate ? {
            createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            },
        } : {}),
    };

    // 1. Totales Generales (IN/OUT)
    const totalIn = await prisma.moneyMovement.aggregate({
        where: { ...where, type: 'IN' },
        _sum: { amount: true }
    });

    const totalOut = await prisma.moneyMovement.aggregate({
        where: { ...where, type: 'OUT' },
        _sum: { amount: true }
    });

    // 2. Por Método de Pago
    const paymentMethodStats = await prisma.moneyMovement.groupBy({
        by: ['paymentMethod', 'type'],
        where,
        _sum: { amount: true },
        _count: true
    });

    // Agrupar por método de pago
    const paymentMethods = [...new Set(paymentMethodStats.map(s => s.paymentMethod))];
    const byPaymentMethod = paymentMethods.map(method => {
        const stats = paymentMethodStats.filter(s => s.paymentMethod === method);
        const inStat = stats.find(s => s.type === 'IN');
        const outStat = stats.find(s => s.type === 'OUT');

        return {
            paymentMethod: method,
            in: parseFloat(inStat?._sum.amount || 0),
            out: parseFloat(outStat?._sum.amount || 0),
            total: parseFloat((inStat?._sum.amount || 0) + (outStat?._sum.amount || 0)),
            transactions: (inStat?._count || 0) + (outStat?._count || 0)
        };
    });

    // 3. Por Categoría (OPTIMIZADO)
    // Agrupamos por ID de categoría y Tipo (IN/OUT) directamente en BD
    const categoryStats = await prisma.moneyMovement.groupBy({
        by: ['categoryId', 'type'],
        where: {
            ...where,
            categoryId: { not: null }
        },
        _sum: { amount: true },
    });

    // Para mostrar los nombres, buscamos las categorías involucradas
    // Obtenemos IDs únicos
    const categoryIds = [...new Set(categoryStats.map(s => s.categoryId))];
    const categories = await prisma.moneyCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true }
    });

    // Mapeamos los resultados para el formato que necesita el frontend
    const groupedByCategory = categories.map(cat => {
        // Filtrar stats para esta categoría
        const stats = categoryStats.filter(s => s.categoryId === cat.id);

        const totalIn = stats.find(s => s.type === 'IN')?._sum.amount || 0;
        const totalOut = stats.find(s => s.type === 'OUT')?._sum.amount || 0;

        return {
            category: cat, // Objeto {id, name}
            total: parseFloat(totalIn) + parseFloat(totalOut), // Movimiento total
            in: parseFloat(totalIn),
            out: parseFloat(totalOut),
            balance: parseFloat(totalIn) - parseFloat(totalOut) // Opcional: Neto
        };
    });

    return {
        summary: {
            totalIn: parseFloat(totalIn._sum.amount || 0),
            totalOut: parseFloat(totalOut._sum.amount || 0),
            balance: parseFloat((totalIn._sum.amount || 0) - (totalOut._sum.amount || 0))
        },
        byPaymentMethod,
        byCategory: groupedByCategory, // Ahora usas el array optimizado
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

// ... imports

export const updateMoneyMovement = async (companyId, movementId, data) => {
    // 1. Buscar el movimiento
    const movement = await prisma.moneyMovement.findFirst({
        where: { id: movementId, companyId },
    });

    if (!movement) {
        throw new AppError('Movimiento de dinero no encontrado', 404);
    }

    // --- PROTECCIÓN DE INTEGRIDAD ---
    // Si el movimiento tiene un referenceType (SALE, ORDER, PURCHASE), 
    // significa que fue creado por otro sistema. No se debe tocar directamente.
    if (movement.referenceType && movement.referenceType !== 'OTHER') {
        throw new AppError(`No puedes editar manualmente un movimiento generado por una ${movement.referenceType}. Debes corregir la operación original.`, 403);
    }
    // -------------------------------

    const updated = await prisma.moneyMovement.update({
        where: { id: movementId },
        data: { /* ... */ }, // Igual que antes
        include: { /* ... */ },
    });

    return updated;
};

export const deleteMoneyMovement = async (companyId, movementId) => {
    const movement = await prisma.moneyMovement.findFirst({
        where: { id: movementId, companyId },
    });

    if (!movement) throw new AppError('Movimiento no encontrado', 404);

    // --- PROTECCIÓN DE INTEGRIDAD ---
    if (movement.referenceType && movement.referenceType !== 'OTHER') {
        throw new AppError(`No puedes eliminar un movimiento vinculado a una ${movement.referenceType}. Debes anular la Venta/Compra original.`, 403);
    }
    // -------------------------------

    await prisma.moneyMovement.delete({ where: { id: movementId } });

    return { message: 'Movimiento eliminado exitosamente' };
};