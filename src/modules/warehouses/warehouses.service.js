import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';

export const createWarehouse = async (companyId, data) => {
    const warehouse = await prisma.warehouse.create({
        data: {
            name: data.name,
            companyId,
            active: true,
        },
    });

    return warehouse;
};

export const getWarehouses = async (companyId, filters = {}) => {
    const { page = 1, limit = 10, active } = filters;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        ...(active !== undefined && { active }),
    };

    const [warehouses, total] = await Promise.all([
        prisma.warehouse.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { stocks: true } }, // CORREGIDO: stocks (plural)
            },
        }),
        prisma.warehouse.count({ where }),
    ]);

    return {
        data: warehouses,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

// 1. MODIFICAR: Eliminamos el include masivo de stocks aquí
export const getWarehouseById = async (companyId, warehouseId) => {
    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
        // Eliminamos el 'include: { stocks: ... }' para hacerlo ligero
    });

    if (!warehouse) {
        throw new AppError('Almacén no encontrado', 404);
    }

    return warehouse;
};

// 2. AGREGAR: Nueva función dedicada a listar stocks paginados
export const getWarehouseStocks = async (companyId, warehouseId, filters = {}) => {
    // Primero verificamos que el almacén pertenezca a la empresa
    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
    });

    if (!warehouse) {
        throw new AppError('Almacén no encontrado', 404);
    }

    const { page = 1, limit = 10, search } = filters;
    const skip = (page - 1) * limit;

    // Filtro base: Stocks de este almacén
    const where = {
        warehouseId,
        ...(search && {
            product: {
                name: { contains: search, mode: 'insensitive' }
            }
        })
    };

    const [stocks, total] = await Promise.all([
        prisma.stock.findMany({
            where,
            skip,
            take: limit,
            include: {
                product: {
                    select: { id: true, name: true, sku: true }
                }
            },
            orderBy: { quantity: 'desc' } // Opcional: ordenar por cantidad
        }),
        prisma.stock.count({ where }),
    ]);

    return {
        data: stocks,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

export const updateWarehouse = async (companyId, warehouseId, data) => {
    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
    });

    if (!warehouse) {
        throw new AppError('Almacén no encontrado', 404);
    }

    const updated = await prisma.warehouse.update({
        where: { id: warehouseId },
        data: {
            name: data.name || undefined,
            active: data.active !== undefined ? data.active : undefined,
        },
    });

    return updated;
};
