import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as warehousesService from './warehouses.service.js';

export const createWarehouse = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { name } = req.body;

  const warehouse = await warehousesService.createWarehouse(companyId, { name });

  res.status(201).json({
    success: true,
    message: 'Almacén creado exitosamente',
    data: warehouse,
  });
});

export const getWarehouses = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { page, limit, active } = req.query;

  const result = await warehousesService.getWarehouses(companyId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    active: active === 'true',
  });

  res.json({
    success: true,
    ...result,
  });
});

export const getWarehouseById = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;

  const warehouse = await warehousesService.getWarehouseById(companyId, id);

  res.json({
    success: true,
    data: warehouse,
  });
});

export const updateWarehouse = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;
  const { name, active } = req.body;

  const warehouse = await warehousesService.updateWarehouse(companyId, id, {
    name,
    active,
  });

  res.json({
    success: true,
    message: 'Almacén actualizado exitosamente',
    data: warehouse,
  });
});
