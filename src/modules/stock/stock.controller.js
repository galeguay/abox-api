import * as stockService from './stock.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

// ==================== STOCK ====================

export const getStockByProduct = asyncWrapper(async (req, res) => {
  const { companyId, productId, warehouseId } = req.params;
  const stock = await stockService.getStockByProduct(companyId, productId, warehouseId);
  res.json({ ok: true, data: stock });
});

export const getTotalStock = asyncWrapper(async (req, res) => {
  const { companyId, productId } = req.params;
  const stock = await stockService.getTotalStock(companyId, productId);
  res.json({ ok: true, data: stock });
});

// ==================== MOVIMIENTOS ====================

export const createStockMovement = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  
  // AHORA SÍ: Pasamos el usuario (req.user.sub) al servicio
  const result = await stockService.createManualAdjustment(
    companyId,
    req.body,
    req.user.sub 
  );
  
  res.status(201).json({ ok: true, data: result });
});

export const transferStock = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  // Transferencia también recibe el usuario
  const result = await stockService.transferStock(companyId, req.body, req.user.sub);
  res.status(201).json({ ok: true, data: result });
});

export const getStockMovements = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { page = 1, limit = 10, type, startDate, endDate, productId, warehouseId } =
    req.query;
  const result = await stockService.getStockMovements(
    companyId,
    parseInt(page),
    parseInt(limit),
    { type, startDate, endDate, productId, warehouseId }
  );
  res.json({ ok: true, data: result });
});