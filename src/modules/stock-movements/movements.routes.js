import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import * as movementsController from './movements.controller.js';
import {
  createStockMovementValidator,
  transferStockValidator,
  listStockMovementsValidator,
} from './movements.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// GET /companies/:companyId/stock-movements - Listar movimientos
router.get(
  '/companies/:companyId/stock-movements',
  listStockMovementsValidator,
  validateFields,
  auditMiddleware('READ', 'STOCK_MOVEMENT'),
  movementsController.getStockMovements
);

// POST /companies/:companyId/stock-movements - Crear movimiento
router.post(
  '/companies/:companyId/stock-movements',
  createStockMovementValidator,
  validateFields,
  auditMiddleware('CREATE', 'STOCK_MOVEMENT'),
  movementsController.createStockMovement
);

// POST /companies/:companyId/stock-movements/transfer - Transferir stock
router.post(
  '/companies/:companyId/stock-movements/transfer',
  transferStockValidator,
  validateFields,
  auditMiddleware('CREATE', 'STOCK_TRANSFER'),
  movementsController.transferStock
);

export default router;
