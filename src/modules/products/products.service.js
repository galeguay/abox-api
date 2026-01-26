import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';


export const createProduct = async (companyId, data) => {
    return prisma.$transaction(async (tx) => {
        // 1. Validar SKU único por empresa dentro de la transacción
        if (data.sku) {
            const existingSku = await tx.product.findFirst({
                where: { companyId, sku: data.sku },
            });
            if (existingSku) {
                throw new AppError('Ya existe un producto con este SKU en tu empresa', 409);
            }
        }

        const product = await tx.product.create({
            data: {
                name: data.name,
                sku: data.sku || `SKU-${Date.now()}`,
                companyId,
                active: true,
                // Vinculamos la categoría si viene en el request
                productCategoryId: data.categoryId || null,
            },
        });

        if (data.cost) {
            await tx.productCost.create({
                data: {
                    companyId,
                    productId: product.id,
                    cost: data.cost,
                    reason: 'Costo inicial al crear producto',
                },
            });
        }

        return product;
    });
};

export const getProducts = async (companyId, filters = {}) => {
    const { page = 1, limit = 10, search, active, categoryId } = filters;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
            ]
        }),
        ...(active !== undefined && { active: active === 'true' || active === true }),
        ...(categoryId && { productCategoryId: categoryId }),
    };

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { stocks: true } },
                productCategory: { select: { id: true, name: true } },
                costs: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: { cost: true }
                }
            },
        }),
        prisma.product.count({ where }),
    ]);

    return {
        data: products,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

export const getProductById = async (companyId, productId) => {
    const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
        include: {
            stocks: {
                include: { warehouse: { select: { id: true, name: true } } },
            },
            productCategory: { select: { id: true, name: true } },
            costs: {
                orderBy: { createdAt: 'desc' },
                take: 5 // Historial reciente de costos
            }
        },
    });

    if (!product) {
        throw new AppError('Producto no encontrado', 404);
    }

    return product;
};

export const updateProduct = async (companyId, productId, data) => {
    const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
    });

    if (!product) {
        throw new AppError('Producto no encontrado', 404);
    }

    // Validar SKU único si cambia
    if (data.sku && data.sku !== product.sku) {
        const existingSku = await prisma.product.findFirst({
            where: { companyId, sku: data.sku },
        });
        if (existingSku) {
            throw new AppError('Ya existe un producto con este SKU en tu empresa', 409);
        }
    }

    return prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
            where: { id: productId },
            data: {
                name: data.name || undefined,
                sku: data.sku || undefined,
                active: data.active !== undefined ? data.active : undefined,
                productCategoryId: data.categoryId || undefined,
            },
        });

        // Si actualizan el costo, creamos un nuevo registro en el historial
        if (data.cost) {
            // Verificamos el último costo para no duplicar si es el mismo
            const lastCost = await tx.productCost.findFirst({
                where: { productId },
                orderBy: { createdAt: 'desc' }
            });

            if (!lastCost || Number(lastCost.cost) !== Number(data.cost)) {
                await tx.productCost.create({
                    data: {
                        companyId,
                        productId,
                        cost: data.cost,
                        reason: 'Actualización manual de producto',
                    },
                });
            }
        }

        return updated;
    });
};

export const deleteProduct = async (companyId, productId) => {
    const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
    });

    if (!product) {
        throw new AppError('Producto no encontrado', 404);
    }

    // Verificamos si el producto tiene historial que impida borrarlo
    const [hasStock, hasSales, hasPurchases] = await Promise.all([
        prisma.stock.findFirst({ where: { productId, quantity: { gt: 0 } } }), // Solo importa si tiene cantidad > 0
        prisma.saleItem.findFirst({ where: { productId } }),
        prisma.purchaseItem.findFirst({ where: { productId } })
    ]);

    // Si tiene stock actual, no dejamos ni borrar ni desactivar (regla de negocio sugerida)
    if (hasStock) {
        throw new AppError('No puedes eliminar un producto que tiene stock físico actual. Haz un ajuste de salida primero.', 409);
    }

    const hasHistory = hasSales || hasPurchases;

    if (hasHistory) {
        await prisma.product.update({
            where: { id: productId },
            data: { active: false, sku: `${product.sku}-DELETED-${Date.now()}` }
        });
        return { message: 'Producto desactivado correctamente (tenía historial asociado)' };
    }

    // Si está limpio, borrado físico
    await prisma.product.delete({ where: { id: productId } });
    return { message: 'Producto eliminado permanentemente' };
};