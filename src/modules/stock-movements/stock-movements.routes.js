import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js'; // Ajusta la ruta según tu estructura
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import {
    getStockMovements,
    createStockMovement,
    transferStock
} from './stock-movements.controller.js';

import {
    listStockMovementsValidator,
    createStockMovementValidator,
    transferStockValidator
} from './stock-movements.validator.js';

const router = Router({ mergeParams: true });
// mergeParams: true permite acceder a :companyId si el router padre lo define 
// (ej: app.use('/companies/:companyId/movements', stockMovementRoutes))

router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// ==================== LECTURA ====================

// GET / (Listar movimientos con filtros)
router.get(
    '/',
    listStockMovementsValidator,
    validateFields,
    auditMiddleware('READ', 'STOCK_MOVEMENT'),
    getStockMovements
);

// ==================== ESCRITURA ====================

// POST / (Crear movimiento manual / ajuste)
router.post(
    '/',
    createStockMovementValidator,
    validateFields,
    auditMiddleware('CREATE', 'STOCK_MOVEMENT'),
    createStockMovement
);

// POST /transfer (Transferencia entre almacenes)
router.post(
    '/transfer',
    transferStockValidator,
    validateFields,
    auditMiddleware('CREATE', 'STOCK_TRANSFER'),
    transferStock
);

export default router;