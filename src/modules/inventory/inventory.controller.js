import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as inventoryService from './inventory.service.js';

export const getStockByProduct = asyncWrapper(async (req, res) => {
    const { companyId, productId } = req.params;
    const { warehouseId } = req.query;

    const stock = await inventoryService.getStockByProduct(companyId, productId, warehouseId);

    res.json({
        success: true,
        data: stock,
    });
});

export const getTotalStock = asyncWrapper(async (req, res) => {
    const { companyId, productId } = req.params;

    const stock = await inventoryService.getTotalStock(companyId, productId);

    res.json({
        success: true,
        data: stock,
    });
});

export const getInventoryReport = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { page, limit, categoryId } = req.query; // Extraemos categoryId de la query

    const result = await inventoryService.getInventoryReport(
        companyId,
        parseInt(page) || 1,
        parseInt(limit) || 10,
        categoryId // Lo pasamos al servicio
    );

    res.json({
        success: true,
        data: result.items,
        pagination: result.pagination
    });
});