import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';

const { Decimal } = Prisma;

export const getStockByProduct = async (companyId, productId, warehouseId) => {
    const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
    });

    if (!product) throw new AppError('Producto no encontrado', 404);

    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
    });

    if (!warehouse) throw new AppError('Almacén no encontrado', 404);

    const stock = await prisma.stock.findFirst({
        where: { productId, warehouseId },
    });

    return {
        product: { id: product.id, name: product.name, sku: product.sku },
        warehouse: { id: warehouse.id, name: warehouse.name },
        // Convertimos a número solo para la respuesta JSON final
        quantity: stock ? new Decimal(stock.quantity).toNumber() : 0,
        lastUpdated: stock?.updatedAt,
    };
};

export const getTotalStock = async (companyId, productId) => {
    const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
    });

    if (!product) throw new AppError('Producto no encontrado', 404);

    const stocks = await prisma.stock.findMany({
        where: { productId },
        include: { warehouse: { select: { id: true, name: true } } },
    });

    // Usamos .plus() de Decimal para una suma exacta
    const totalQuantity = stocks.reduce(
        (sum, s) => sum.plus(new Decimal(s.quantity)),
        new Decimal(0)
    );

    return {
        product: { id: product.id, name: product.name, sku: product.sku },
        totalQuantity: totalQuantity.toNumber(), // Retornamos el valor preciso
        byWarehouse: stocks.map(s => ({
            warehouse: s.warehouse,
            quantity: new Decimal(s.quantity).toNumber(),
        })),
    };
};

// inventory.service.js

export const getInventoryReport = async (companyId, page = 1, limit = 10, categoryId = null) => {
    const skip = (page - 1) * limit;

    const whereClause = {
        companyId,
        active: true,
        ...(categoryId && { productCategoryId: categoryId }),
    };

    // PASO 1: Obtenemos solo los productos (sin incluir 'stock' todavía para no saturar memoria)
    const [totalItems, products] = await Promise.all([
        prisma.product.count({ where: whereClause }),
        prisma.product.findMany({
            where: whereClause,
            include: { productCategory: true }, // Ya no incluimos 'stock' aquí
            skip,
            take: limit,
            orderBy: { name: 'asc' },
        }),
    ]);

    // Extraemos los IDs de los productos que acabamos de traer
    const productIds = products.map(p => p.id);

    // PASO 2: Hacemos una consulta AGREGADA (La Optimización)
    // "Dame la suma de cantidad agrupada por productId, pero solo de estos IDs"
    const stocksAggregated = await prisma.stock.groupBy({
        by: ['productId'],
        where: {
            productId: { in: productIds }, // Filtramos solo los productos de esta página
            // warehouse: { active: true } // Opcional: si quisieras filtrar almacenes activos
        },
        _sum: {
            quantity: true, // Esto reemplaza tu .reduce() manual
        },
    });

    // PASO 3: (Opcional) Si AUN necesitas el detalle por almacén para el reporte
    // Lo traemos en una consulta separada y optimizada, o usamos include en el paso 1.
    // PERO, si el reporte es solo de "Totales", el paso 3 no se hace y ahorraste 90% de recursos.

    // Si necesitas el desglose por almacén, podemos hacer un fetch eficiente:
    const stocksDetails = await prisma.stock.findMany({
        where: { productId: { in: productIds } },
        include: { warehouse: { select: { id: true, name: true } } }
    });

    // PASO 4: Combinar los datos en memoria (Mapeo)
    const report = products.map(product => {
        // Buscamos el total calculado por la DB
        const stockEntry = stocksAggregated.find(s => s.productId === product.id);
        const totalQuantity = stockEntry?._sum.quantity ? new Decimal(stockEntry._sum.quantity).toNumber() : 0;

        // Filtramos los detalles correspondientes (si los trajiste en el paso 3)
        const productStocks = stocksDetails.filter(s => s.productId === product.id);

        return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.productCategory?.name || 'Sin categoría',
            totalQuantity: totalQuantity, // ¡Este valor vino directo de la DB!
            byWarehouse: productStocks.map(s => ({
                warehouse: s.warehouse,
                quantity: new Decimal(s.quantity).toNumber(),
            })),
        };
    });

    return {
        items: report,
        pagination: {
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            limit,
        },
    };
};