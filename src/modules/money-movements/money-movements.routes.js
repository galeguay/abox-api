import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import * as moneyMovementsController from './money-movements.controller.js';
import {
    createMoneyMovementValidator,
    updateMoneyMovementValidator,
    listMoneyMovementsValidator,
} from './money-movements.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// GET /companies/:companyId/money-movements/reports/summary - Reporte
router.get(
    '/companies/:companyId/money-movements/reports/summary',
    listMoneyMovementsValidator,
    validateFields,
    auditMiddleware('READ', 'MONEY_MOVEMENT'),
    moneyMovementsController.getMoneyMovementsReport
);

// GET /companies/:companyId/money-movements - Listar movimientos
router.get(
    '/companies/:companyId/money-movements',
    listMoneyMovementsValidator,
    validateFields,
    auditMiddleware('READ', 'MONEY_MOVEMENT'),
    moneyMovementsController.getMoneyMovements
);

// POST /companies/:companyId/money-movements - Crear movimiento
router.post(
    '/companies/:companyId/money-movements',
    createMoneyMovementValidator,
    validateFields,
    auditMiddleware('CREATE', 'MONEY_MOVEMENT'),
    moneyMovementsController.createMoneyMovement
);

// GET /companies/:companyId/money-movements/:id - Obtener movimiento
router.get(
    '/companies/:companyId/money-movements/:id',
    auditMiddleware('READ', 'MONEY_MOVEMENT'),
    moneyMovementsController.getMoneyMovementById
);

// PUT /companies/:companyId/money-movements/:id - Actualizar movimiento
router.put(
    '/companies/:companyId/money-movements/:id',
    updateMoneyMovementValidator,
    validateFields,
    auditMiddleware('UPDATE', 'MONEY_MOVEMENT'),
    moneyMovementsController.updateMoneyMovement
);

// DELETE /companies/:companyId/money-movements/:id - Eliminar movimiento
router.delete(
    '/companies/:companyId/money-movements/:id',
    auditMiddleware('DELETE', 'MONEY_MOVEMENT'),
    moneyMovementsController.deleteMoneyMovement
);

export default router;
