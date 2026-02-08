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

        // Creamos el producto
        const product = await tx.product.create({
            data: {
                name: data.name,
                sku: data.sku || `SKU-${Date.now()}`,
                companyId,
                price: data.price || 0,
                active: true,
                productCategoryId: data.categoryId || null,
                barcode: data.barcode || null,
            },
        });

        // Registro de precio inicial
        if (data.price) {
            await tx.productPrice.create({
                data: {
                    companyId,
                    productId: product.id,
                    price: data.price,
                    reason: 'Precio inicial',
                },
            });
        }

        // Registro de costo inicial
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
    // 1. Desestructuración segura
    const {
        page = 1,
        limit = 10,
        search,
        active,
        categoryId,
        sortBy = 'createdAt',
        order = 'desc',
        minPrice,
        maxPrice,
        fromDate,
        toDate,
        stockStatus
    } = filters;

    // 2. Sanitización de Paginación (Evita números negativos o textos)
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum;

    // 3. Sanitización de Precios
    const parsedMin = parseFloat(minPrice);
    const parsedMax = parseFloat(maxPrice);
    const hasMinPrice = !isNaN(parsedMin);
    const hasMaxPrice = !isNaN(parsedMax);

    // 4. Sanitización de Fechas
    const dFrom = fromDate ? new Date(fromDate) : null;
    const dTo = toDate ? new Date(toDate) : null;
    const hasFromDate = dFrom && !isNaN(dFrom.getTime());
    const hasToDate = dTo && !isNaN(dTo.getTime());

    const where = {
        companyId,
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } }
            ]
        }),
        // Manejo robusto de booleans (acepta true, "true", false, "false")
        ...(active !== undefined && active !== '' && { 
            active: String(active) === 'true' 
        }),
        ...(categoryId && categoryId !== 'all' && { productCategoryId: categoryId }),

        // Rango de Precios (Solo agrega si los números son válidos)
        ...((hasMinPrice || hasMaxPrice) && {
            price: {
                ...(hasMinPrice && { gte: parsedMin }),
                ...(hasMaxPrice && { lte: parsedMax }),
            }
        }),

        // Rango de Fechas (Solo agrega si las fechas son válidas)
        ...((hasFromDate || hasToDate) && {
            createdAt: {
                ...(hasFromDate && { gte: dFrom }),
                ...(hasToDate && { lte: dTo }),
            }
        }),

        // Estado de Stock
        ...(stockStatus === 'inStock' && {
            stocks: { some: { quantity: { gt: 0 } } }
        }),
        ...(stockStatus === 'outOfStock' && {
            stocks: { every: { quantity: { lte: 0 } } }
        })
    };

    // 5. Ordenamiento Dinámico
    let orderBy = {};
    if (sortBy === 'price') {
        orderBy = { price: order };
    } else {
        // Protección extra: solo permitimos ordenar por campos que existen para evitar errores
        const allowedSorts = ['createdAt', 'updatedAt', 'name', 'sku', 'price'];
        const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
        orderBy = { [safeSortBy]: order };
    }

    const [products, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: limitNum,
            orderBy,
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
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
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
                take: 5 
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
                price: data.price || undefined,
                sku: data.sku || undefined,
                active: data.active !== undefined ? data.active : undefined,
                productCategoryId: data.categoryId || undefined,
            },
        });

        if (data.price) {
            const lastPrice = await tx.productPrice.findFirst({
                where: { productId },
                orderBy: { createdAt: 'desc' }
            });
            
            // Convertimos a Number para comparar correctamente precios (Prisma usa Decimal a veces)
            if (!lastPrice || Number(lastPrice.price) !== Number(data.price)) {
                await tx.productPrice.create({
                    data: {
                        companyId,
                        productId,
                        price: data.price,
                        reason: 'Cambio manual de precio',
                    },
                });
            }
        }

        if (data.cost) {
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

    const [hasStock, hasSales, hasPurchases] = await Promise.all([
        prisma.stock.findFirst({ where: { productId, quantity: { gt: 0 } } }),
        prisma.saleItem.findFirst({ where: { productId } }),
        prisma.purchaseItem.findFirst({ where: { productId } })
    ]);

    if (hasStock) {
        throw new AppError('No puedes eliminar un producto que tiene stock físico actual. Haz un ajuste de salida primero.', 409);
    }

    const hasHistory = hasSales || hasPurchases;

    if (hasHistory) {
        // Soft delete: Desactivar y liberar SKU
        await prisma.product.update({
            where: { id: productId },
            data: { 
                active: false, 
                sku: `${product.sku}-DELETED-${Date.now()}` // Liberamos el SKU original
            }
        });
        return { message: 'Producto desactivado correctamente (tenía historial asociado)' };
    }

    await prisma.product.delete({ where: { id: productId } });
    return { message: 'Producto eliminado permanentemente' };
};