import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as categoriesService from './productCategories.service.js';

export const createCategory = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { name } = req.body;

  const category = await categoriesService.createCategory(companyId, { name });

  res.status(201).json({
    success: true,
    message: 'Categoría creada exitosamente',
    data: category,
  });
});

export const getCategories = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { page, limit, search } = req.query;

  const result = await categoriesService.getCategories(companyId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    search,
  });

  res.json({
    success: true,
    ...result,
  });
});

export const getCategoryById = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;

  const category = await categoriesService.getCategoryById(companyId, id);

  res.json({
    success: true,
    data: category,
  });
});

export const updateCategory = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;
  const { name } = req.body;

  const category = await categoriesService.updateCategory(companyId, id, {
    name,
  });

  res.json({
    success: true,
    message: 'Categoría actualizada exitosamente',
    data: category,
  });
});

export const deleteCategory = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;

  const result = await categoriesService.deleteCategory(companyId, id);

  res.json({
    success: true,
    message: result.message,
  });
});