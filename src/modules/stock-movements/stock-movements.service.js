import prisma from '../../../prisma/client.js';

// ==========================================
// ESCRITURA (Interna / Transaccional)
// ==========================================

/**
 * Registra una fila en el historial.
 * NO actualiza cantidades, solo deja constancia.
 */
export const logStockMovement = async (data, tx) => {
    const { 
        companyId, 
        warehouseId, 
        productId, 
        type, 
        quantity, 
        referenceType, 
        referenceId, 
        notes, 
        userId 
    } = data;

    return await tx.stockMovement.create({
        data: {
            companyId,
            warehouseId,
            productId,
            type, // 'IN', 'OUT', 'ADJUST'
            quantity: parseFloat(quantity), // O usar Decimal si migraste
            referenceType, // 'SALE', 'PURCHASE', 'TRANSFER', 'ADJUSTMENT'
            referenceId: referenceId || null,
            notes: notes || null,
            createdById: userId 
        },
    });
};

// ==========================================
// LECTURA (Reportes)
// ==========================================

export const getStockMovements = async (companyId, filters = {}) => {
    const { page = 1, limit = 10, type, startDate, endDate, productId, warehouseId } = filters;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        ...(type && { type }),
        ...(productId && { productId }),
        ...(warehouseId && { warehouseId }),
        ...(startDate || endDate ? {
            createdAt: {
                ...(startDate && { gte: new Date(startDate) }),
                ...(endDate && { lte: new Date(endDate) }),
            },
        } : {}),
    };

    const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                product: { select: { name: true, sku: true } },
                warehouse: { select: { name: true } },
                createdBy: { select: { email: true, name: true } }
            },
        }),
        prisma.stockMovement.count({ where }),
    ]);

    return {
        data: movements,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};