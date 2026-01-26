import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as productsService from './products.service.js';

export const createProduct = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { name, sku } = req.body;

  const product = await productsService.createProduct(companyId, { name, sku });

  res.status(201).json({
    success: true,
    message: 'Producto creado exitosamente',
    data: product,
  });
});

export const getProducts = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { page, limit, search, active } = req.query;

  const result = await productsService.getProducts(companyId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    search,
    active: active === 'true',
  });

  res.json({
    success: true,
    ...result,
  });
});

export const getProductById = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;

  const product = await productsService.getProductById(companyId, id);

  res.json({
    success: true,
    data: product,
  });
});

export const updateProduct = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;
  const { name, sku, active } = req.body;

  const product = await productsService.updateProduct(companyId, id, {
    name,
    sku,
    active,
  });

  res.json({
    success: true,
    message: 'Producto actualizado exitosamente',
    data: product,
  });
});

export const deleteProduct = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;

  const result = await productsService.deleteProduct(companyId, id);

  res.json({
    success: true,
    message: result.message,
  });
});
