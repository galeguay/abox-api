import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';

export const createCategory = async (companyId, data) => {
    // 1. Validar nombre único por empresa
    const existingCategory = await prisma.productCategory.findUnique({
        where: {
            companyId_name: {
                companyId,
                name: data.name,
            },
        },
    });

    if (existingCategory) {
        throw new AppError('Ya existe una categoría con este nombre en tu empresa', 409);
    }

    const category = await prisma.productCategory.create({
        data: {
            name: data.name,
            companyId,
        },
    });

    return category;
};

export const getCategories = async (companyId, filters = {}) => {
    const { page = 1, limit = 10, search } = filters;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        ...(search && {
            name: { contains: search, mode: 'insensitive' },
        }),
    };

    const [categories, total] = await Promise.all([
        prisma.productCategory.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { products: true } }, // Útil para mostrar cuántos productos tiene
            },
        }),
        prisma.productCategory.count({ where }),
    ]);

    return {
        data: categories,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

export const getCategoryById = async (companyId, id) => {
    const category = await prisma.productCategory.findFirst({
        where: { id, companyId },
        include: {
            _count: { select: { products: true } },
        },
    });

    if (!category) {
        throw new AppError('Categoría no encontrada', 404);
    }

    return category;
};

export const updateCategory = async (companyId, id, data) => {
    const category = await prisma.productCategory.findFirst({
        where: { id, companyId },
    });

    if (!category) {
        throw new AppError('Categoría no encontrada', 404);
    }

    // Si cambia el nombre, validar duplicados
    if (data.name && data.name !== category.name) {
        const existingName = await prisma.productCategory.findUnique({
            where: {
                companyId_name: {
                    companyId,
                    name: data.name,
                },
            },
        });
        if (existingName) {
            throw new AppError('Ya existe una categoría con este nombre', 409);
        }
    }

    const updated = await prisma.productCategory.update({
        where: { id },
        data: {
            name: data.name || undefined,
        },
    });

    return updated;
};

export const deleteCategory = async (companyId, id) => {
    const category = await prisma.productCategory.findFirst({
        where: { id, companyId },
    });

    if (!category) {
        throw new AppError('Categoría no encontrada', 404);
    }

    // Validar si tiene productos asociados
    const productsCount = await prisma.product.count({
        where: { productCategoryId: id },
    });

    if (productsCount > 0) {
        throw new AppError(
            `No se puede eliminar la categoría porque tiene ${productsCount} productos asociados. Por favor, reasigna o elimina los productos primero.`,
            409
        );
    }

    await prisma.productCategory.delete({ where: { id } });

    return { message: 'Categoría eliminada correctamente' };
};