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

// POST /stock/:companyId/products - Crear producto
router.post(
  '/:companyId/products',
  createProductValidator,
  validateFields,
  auditMiddleware('CREATE', 'PRODUCT'),
  createProduct
);

// GET /stock/:companyId/products - Listar productos
router.get(
  '/:companyId/products',
  listProductsValidator,
  validateFields,
  auditMiddleware('READ', 'PRODUCT'),
  getProducts
);

// GET /stock/:companyId/products/:productId - Obtener producto
router.get(
  '/:companyId/products/:productId',
  auditMiddleware('READ', 'PRODUCT'),
  getProductById
);

// PUT /stock/:companyId/products/:productId - Actualizar producto
router.put(
  '/:companyId/products/:productId',
  updateProductValidator,
  validateFields,
  auditMiddleware('UPDATE', 'PRODUCT'),
  updateProduct
);

// DELETE /stock/:companyId/products/:productId - Eliminar producto
router.delete(
  '/:companyId/products/:productId',
  auditMiddleware('DELETE', 'PRODUCT'),
  deleteProduct
);

// ==================== ALMACENES ====================

// POST /stock/:companyId/warehouses - Crear almacén
router.post(
  '/:companyId/warehouses',
  createWarehouseValidator,
  validateFields,
  auditMiddleware('CREATE', 'WAREHOUSE'),
  createWarehouse
);

// GET /stock/:companyId/warehouses - Listar almacenes
router.get(
  '/:companyId/warehouses',
  listWarehousesValidator,
  validateFields,
  auditMiddleware('READ', 'WAREHOUSE'),
  getWarehouses
);

// GET /stock/:companyId/warehouses/:warehouseId - Obtener almacén
router.get(
  '/:companyId/warehouses/:warehouseId',
  auditMiddleware('READ', 'WAREHOUSE'),
  getWarehouseById
);

// PUT /stock/:companyId/warehouses/:warehouseId - Actualizar almacén
router.put(
  '/:companyId/warehouses/:warehouseId',
  updateWarehouseValidator,
  validateFields,
  auditMiddleware('UPDATE', 'WAREHOUSE'),
  updateWarehouse
);

// ==================== STOCK ====================

// GET /stock/:companyId/products/:productId/warehouses/:warehouseId - Obtener stock específico
router.get(
  '/:companyId/products/:productId/warehouses/:warehouseId',
  auditMiddleware('READ', 'STOCK'),
  getStockByProduct
);

// GET /stock/:companyId/products/:productId/total - Obtener stock total
router.get(
  '/:companyId/products/:productId/total',
  auditMiddleware('READ', 'STOCK'),
  getTotalStock
);

// ==================== MOVIMIENTOS DE STOCK ====================

// POST /stock/:companyId/movements - Crear movimiento de stock
router.post(
  '/:companyId/movements',
  createStockMovementValidator,
  validateFields,
  auditMiddleware('CREATE', 'STOCK_MOVEMENT'),
  createStockMovement
);

// POST /stock/:companyId/transfer - Transferir stock
router.post(
  '/:companyId/transfer',
  transferStockValidator,
  validateFields,
  auditMiddleware('CREATE', 'STOCK_TRANSFER'),
  transferStock
);

// GET /stock/:companyId/movements - Listar movimientos
router.get(
  '/:companyId/movements',
  listStockMovementsValidator,
  validateFields,
  auditMiddleware('READ', 'STOCK_MOVEMENT'),
  getStockMovements
);

export default router;
