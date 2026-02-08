import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import * as productsController from './products.controller.js';
import {
  createProductValidator,
  updateProductValidator,
  listProductsValidator,
} from './products.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));
//router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// GET /companies/:companyId/products - Listar productos
router.get(
  '/companies/:companyId/products',
  listProductsValidator,
  validateFields,
  ////auditMiddleware('READ', 'PRODUCT'),
  productsController.getProducts
);

// POST /companies/:companyId/products - Crear producto
router.post(
  '/companies/:companyId/products',
  createProductValidator,
  validateFields,
  ////auditMiddleware('CREATE', 'PRODUCT'),
  productsController.createProduct
);

// GET /companies/:companyId/products/:id - Obtener producto
router.get(
  '/companies/:companyId/products/:id',
  ////auditMiddleware('READ', 'PRODUCT'),
  productsController.getProductById
);

// PUT /companies/:companyId/products/:id - Actualizar producto
router.put(
  '/companies/:companyId/products/:id',
  updateProductValidator,
  validateFields,
  //auditMiddleware('UPDATE', 'PRODUCT'),
  productsController.updateProduct
);

// DELETE /companies/:companyId/products/:id - Eliminar producto
router.delete(
  '/companies/:companyId/products/:id',
  //auditMiddleware('DELETE', 'PRODUCT'),
  productsController.deleteProduct
);

export default router;
