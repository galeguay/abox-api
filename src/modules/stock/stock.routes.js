import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

// Importamos SOLO lo que existe en el controlador
import {
    getStockByProduct,
    getTotalStock,
    createStockMovement,
    transferStock,
    getStockMovements,
} from './stock.controller.js';

// Importamos SOLO los validadores relacionados con stock
import {
    createStockMovementValidator,
    transferStockValidator,
    listStockMovementsValidator,
    getStockValidator,
} from './stock.validator.js';

const router = Router();

// Middleware de autenticación global para este router
router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// ==================== CONSULTAS DE STOCK ====================

// GET /companies/:companyId/products/:productId/warehouses/:warehouseId
// Obtener stock de un producto en un almacén específico
router.get(
    '/companies/:companyId/products/:productId/warehouses/:warehouseId',
    getStockValidator, // Valida que companyId y productId existan
    validateFields,     // Ejecuta la validación antes de pasar al controller
    auditMiddleware('READ', 'STOCK'),
    getStockByProduct
);

// GET /companies/:companyId/products/:productId/total
// Obtener stock total de un producto (sumando todos los almacenes)
router.get(
    '/companies/:companyId/products/:productId/total',
    getStockValidator,
    validateFields,
    auditMiddleware('READ', 'STOCK'),
    getTotalStock
);

// ==================== MOVIMIENTOS Y TRANSFERENCIAS ====================

// POST /companies/:companyId/movements
// Crear un movimiento manual (Entrada/Salida/Ajuste)
router.post(
    '/companies/:companyId/movements',
    createStockMovementValidator,
    validateFields,
    auditMiddleware('CREATE', 'STOCK_MOVEMENT'),
    createStockMovement
);

// POST /companies/:companyId/transfer
// Transferir stock entre almacenes
router.post(
    '/companies/:companyId/transfer',
    transferStockValidator,
    validateFields,
    auditMiddleware('CREATE', 'STOCK_TRANSFER'),
    transferStock
);

// GET /companies/:companyId/movements
// Historial de movimientos (con filtros)
router.get(
    '/companies/:companyId/movements',
    listStockMovementsValidator,
    validateFields,
    auditMiddleware('READ', 'STOCK_MOVEMENT'),
    getStockMovements
);

export default router;