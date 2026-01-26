import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as inventoryService from './inventory.service.js';

export const getStockByProduct = asyncWrapper(async (req, res) => {
  const { companyId, productId } = req.params;
  const { warehouseId } = req.query;

  if (!warehouseId) {
    return res.status(400).json({ error: 'warehouseId is required as query parameter' });
  }

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

  const report = await inventoryService.getInventoryReport(companyId);

  res.json({
    success: true,
    data: report,
  });
});
