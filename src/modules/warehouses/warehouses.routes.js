import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import * as warehousesController from './warehouses.controller.js';
import {
  createWarehouseValidator,
  updateWarehouseValidator,
  listWarehousesValidator,
} from './warehouses.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// GET /companies/:companyId/warehouses - Listar almacenes
router.get(
  '/companies/:companyId/warehouses',
  listWarehousesValidator,
  validateFields,
  auditMiddleware('READ', 'WAREHOUSE'),
  warehousesController.getWarehouses
);

// POST /companies/:companyId/warehouses - Crear almacén
router.post(
  '/companies/:companyId/warehouses',
  createWarehouseValidator,
  validateFields,
  auditMiddleware('CREATE', 'WAREHOUSE'),
  warehousesController.createWarehouse
);

// GET /companies/:companyId/warehouses/:id - Obtener almacén
router.get(
  '/companies/:companyId/warehouses/:id',
  auditMiddleware('READ', 'WAREHOUSE'),
  warehousesController.getWarehouseById
);

// PUT /companies/:companyId/warehouses/:id - Actualizar almacén
router.put(
  '/companies/:companyId/warehouses/:id',
  updateWarehouseValidator,
  validateFields,
  auditMiddleware('UPDATE', 'WAREHOUSE'),
  warehousesController.updateWarehouse
);

export default router;
