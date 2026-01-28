import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    createWarehouse,
    getWarehouses,
    getWarehouseById,
    updateWarehouse,
    getStockByProduct,
    getTotalStock,
    createStockMovement,
    transferStock,
    getStockMovements,
} from './stock.controller.js';

import {
    createProductValidator,
    updateProductValidator,
    listProductsValidator,
    createWarehouseValidator,
    updateWarehouseValidator,
    listWarehousesValidator,
    createStockMovementValidator,
    transferStockValidator,
    listStockMovementsValidator,
} from './stock.validator.js';

const router = Router();

// Middleware de autenticación
router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// ==================== PRODUCTOS ====================

// POST /companies/:companyId/products - Crear producto
router.post(
    '/companies/:companyId/products',
    createProductValidator,
    validateFields,
    auditMiddleware('CREATE', 'PRODUCT'),
    createProduct
);

// GET /companies/:companyId/products - Listar productos
router.get(
    '/companies/:companyId/products',
    listProductsValidator,
    validateFields,
    auditMiddleware('READ', 'PRODUCT'),
    getProducts
);

// GET /companies/:companyId/products/:productId - Obtener producto
router.get(
    '/companies/:companyId/products/:productId',
    auditMiddleware('READ', 'PRODUCT'),
    getProductById
);

// PUT /companies/:companyId/products/:productId - Actualizar producto
router.put(
    '/companies/:companyId/products/:productId',
    updateProductValidator,
    validateFields,
    auditMiddleware('UPDATE', 'PRODUCT'),
    updateProduct
);

// DELETE /companies/:companyId/products/:productId - Eliminar producto
router.delete(
    '/companies/:companyId/products/:productId',
    auditMiddleware('DELETE', 'PRODUCT'),
    deleteProduct
);

// ==================== ALMACENES ====================

// POST /companies/:companyId/warehouses - Crear almacén
router.post(
    '/companies/:companyId/warehouses',
    createWarehouseValidator,
    validateFields,
    auditMiddleware('CREATE', 'WAREHOUSE'),
    createWarehouse
);

// GET /companies/:companyId/warehouses - Listar almacenes
router.get(
    '/companies/:companyId/warehouses',
    listWarehousesValidator,
    validateFields,
    auditMiddleware('READ', 'WAREHOUSE'),
    getWarehouses
);

// GET /companies/:companyId/warehouses/:warehouseId - Obtener almacén
router.get(
    '/companies/:companyId/warehouses/:warehouseId',
    auditMiddleware('READ', 'WAREHOUSE'),
    getWarehouseById
);

// PUT /companies/:companyId/warehouses/:warehouseId - Actualizar almacén
router.put(
    '/companies/:companyId/warehouses/:warehouseId',
    updateWarehouseValidator,
    validateFields,
    auditMiddleware('UPDATE', 'WAREHOUSE'),
    updateWarehouse
);

// ==================== STOCK ====================

// GET /companies/:companyId/products/:productId/warehouses/:warehouseId - Obtener stock específico
router.get(
    '/companies/:companyId/products/:productId/warehouses/:warehouseId',
    auditMiddleware('READ', 'STOCK'),
    getStockByProduct
);

// GET /companies/:companyId/products/:productId/total - Obtener stock total
router.get(
    '/companies/:companyId/products/:productId/total',
    auditMiddleware('READ', 'STOCK'),
    getTotalStock
);

// ==================== MOVIMIENTOS DE STOCK ====================

// POST /companies/:companyId/movements - Crear movimiento de stock
router.post(
    '/companies/:companyId/movements',
    createStockMovementValidator,
    validateFields,
    auditMiddleware('CREATE', 'STOCK_MOVEMENT'),
    createStockMovement
);

// POST /companies/:companyId/transfer - Transferir stock
router.post(
    '/companies/:companyId/transfer',
    transferStockValidator,
    validateFields,
    auditMiddleware('CREATE', 'STOCK_TRANSFER'),
    transferStock
);

// GET /companies/:companyId/movements - Listar movimientos
router.get(
    '/companies/:companyId/movements',
    listStockMovementsValidator,
    validateFields,
    auditMiddleware('READ', 'STOCK_MOVEMENT'),
    getStockMovements
);

export default router;
