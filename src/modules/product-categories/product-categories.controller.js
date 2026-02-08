import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as categoriesService from './product-categories.service.js';

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
  const companyIdFromToken = req.companyId; 
  const companyIdFromParams = req.params.companyId;
  console.log(companyIdFromToken);
  console.log(companyIdFromParams);

  // Validación estricta: El usuario solo puede ver SU empresa
  if (companyIdFromParams !== companyIdFromToken) {
      throw new Error('No tienes permiso para acceder a los datos de esta empresa'); 
  }

  const { page, limit, search } = req.query;

  // Usamos companyIdFromToken para garantizar seguridad
  const result = await categoriesService.getCategories(companyIdFromToken, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    search,
  });

  res.json({ success: true, ...result });
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