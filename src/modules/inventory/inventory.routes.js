import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import * as inventoryController from './inventory.controller.js';
import {
  getStockValidator,
  getTotalStockValidator,
  getInventoryReportValidator,
} from './inventory.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER']));

// GET /companies/:companyId/products/:productId/stock?warehouseId=... - Stock por almacén
router.get(
  '/companies/:companyId/products/:productId/stock',
  getStockValidator,
  validateFields,
  auditMiddleware('READ', 'INVENTORY'),
  inventoryController.getStockByProduct
);

// GET /companies/:companyId/products/:productId/total - Stock total
router.get(
  '/companies/:companyId/products/:productId/total',
  getTotalStockValidator,
  validateFields,
  auditMiddleware('READ', 'INVENTORY'),
  inventoryController.getTotalStock
);

// GET /companies/:companyId/inventory/report - Reporte de inventario
router.get(
  '/companies/:companyId/inventory/report',
  getInventoryReportValidator,
  auditMiddleware('READ', 'INVENTORY'),
  inventoryController.getInventoryReport
);

export default router;
