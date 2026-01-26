import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as categoryService from './sales-categories.service.js';

export const createCategory = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { name, color } = req.body;

    const category = await categoryService.createCategory(companyId, { name, color });

    res.status(201).json({
        success: true,
        message: 'Categoría de venta creada',
        data: category
    });
});

export const getCategories = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { includeInactive } = req.query; 

    // Convertimos query param string a boolean
    const showAll = includeInactive === 'true';

    const categories = await categoryService.getCategories(companyId, showAll);

    res.json({
        success: true,
        data: categories
    });
});

export const getCategoryById = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;
    const category = await categoryService.getCategoryById(companyId, id);

    res.json({
        success: true,
        data: category
    });
});

export const updateCategory = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;
    const { name, color, active } = req.body;

    const category = await categoryService.updateCategory(companyId, id, { name, color, active });

    res.json({
        success: true,
        message: 'Categoría actualizada',
        data: category
    });
});
updateCategoryValidator
export const deleteCategory = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;

    await categoryService.deleteCategory(companyId, id);

    res.json({
        success: true,
        message: 'Categoría eliminada (archivada) correctamente'
    });
});