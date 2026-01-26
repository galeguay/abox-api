import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as movementsService from './movements.service.js';

export const createStockMovement = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { productId, warehouseId, type, quantity, reference, notes } = req.body;

  const movement = await movementsService.createStockMovement(companyId, {
    productId,
    warehouseId,
    type,
    quantity,
    reference,
    notes,
  });

  res.status(201).json({
    success: true,
    message: 'Movimiento de stock creado exitosamente',
    data: movement,
  });
});

export const transferStock = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = req.body;

  const result = await movementsService.transferStock(companyId, {
    productId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    notes,
  });

  res.status(201).json({
    success: true,
    message: result.message,
    data: {
      outMovement: result.outMovement,
      inMovement: result.inMovement,
    },
  });
});

export const getStockMovements = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { page, limit, type, startDate, endDate, productId, warehouseId } = req.query;

  const result = await movementsService.getStockMovements(companyId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    type,
    startDate,
    endDate,
    productId,
    warehouseId,
  });

  res.json({
    success: true,
    ...result,
  });
});
