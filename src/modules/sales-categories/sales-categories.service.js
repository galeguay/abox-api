import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';

// Crear nueva categoría
export const createCategory = async (companyId, data) => {
    const { name, color } = data;

    // 1. Validar duplicados (insensible a mayúsculas/minúsculas opcionalmente, aquí estricto)
    const exists = await prisma.saleCategory.findUnique({
        where: {
            companyId_name: {
                companyId,
                name
            }
        }
    });

    if (exists) {
        // Si existe pero estaba inactiva, podríamos reactivarla, 
        // pero para simplificar, lanzamos error o sugerimos reactivar.
        throw new AppError('Ya existe una categoría con ese nombre en tu empresa', 400);
    }

    return await prisma.saleCategory.create({
        data: {
            companyId,
            name,
            color,
            active: true
        }
    });
};

// Listar categorías (Solo activas por defecto para los selectores)
export const getCategories = async (companyId, includeInactive = false) => {
    const where = { companyId };

    // Si no pedimos inactivas explícitamente, filtramos active: true
    if (!includeInactive) {
        where.active = true;
    }

    return await prisma.saleCategory.findMany({
        where,
        orderBy: { name: 'asc' }
    });
};

// Obtener por ID
export const getCategoryById = async (companyId, id) => {
    const category = await prisma.saleCategory.findFirst({
        where: { id, companyId }
    });

    if (!category) throw new AppError('Categoría no encontrada', 404);

    return category;
};

// Actualizar
export const updateCategory = async (companyId, id, data) => {
    const { name, color, active } = data;

    // Verificar existencia
    const category = await getCategoryById(companyId, id);

    if (name) {
        const duplicate = await prisma.saleCategory.findUnique({
            where: { companyId_name: { companyId, name } }
        });

        // Si existe Y no es la misma categoría que estoy editando
        if (duplicate && duplicate.id !== id) {
            throw new AppError('Ya existe otra categoría con este nombre', 400);
        }
    }

    return await prisma.saleCategory.update({
        where: { id },
        data: {
            name,
            color,
            active
        }
    });
};

// Eliminar (Soft Delete recomendado porque hay ventas vinculadas)
export const deleteCategory = async (companyId, id) => {
    // Verificar si tiene ventas asociadas antes de permitir borrar o desactivar
    // (Opcional: Si quieres ser estricto. Si es soft delete, no importa tanto).

    await getCategoryById(companyId, id);

    return await prisma.saleCategory.update({
        where: { id },
        data: { active: false }
    });
};