import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as productsService from './products.service.js';

export const createProduct = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { name, sku, price, categoryId, cost } = req.body;

    const product = await productsService.createProduct(companyId, { name, sku, price, categoryId, cost });

    res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: product,
    });
});

export const getProducts = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const result = await productsService.getProducts(companyId, {
        ...req.query,
        page: req.query.page ? parseInt(req.query.page) : 1,
        limit: req.query.limit ? parseInt(req.query.limit) : 10,
    });

    res.json({ success: true, ...result });
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
    const { name, sku, price, categoryId, cost } = req.body;

    const product = await productsService.updateProduct(companyId, id, {
        name,
        sku,
        price,
        categoryId,
        cost,
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
