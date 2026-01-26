import { Router } from 'express';
import authMiddleware from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import * as categoriesController from './productCategories.controller.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
  listCategoriesValidator,
} from './productCategories.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// GET /companies/:companyId/categories - Listar categorías
router.get(
  '/companies/:companyId/categories',
  listCategoriesValidator,
  validateFields,
  auditMiddleware('READ', 'CATEGORY'),
  categoriesController.getCategories
);

// POST /companies/:companyId/categories - Crear categoría
router.post(
  '/companies/:companyId/categories',
  createCategoryValidator,
  validateFields,
  auditMiddleware('CREATE', 'CATEGORY'),
  categoriesController.createCategory
);

// GET /companies/:companyId/categories/:id - Obtener categoría
router.get(
  '/companies/:companyId/categories/:id',
  auditMiddleware('READ', 'CATEGORY'),
  categoriesController.getCategoryById
);

// PUT /companies/:companyId/categories/:id - Actualizar categoría
router.put(
  '/companies/:companyId/categories/:id',
  updateCategoryValidator,
  validateFields,
  auditMiddleware('UPDATE', 'CATEGORY'),
  categoriesController.updateCategory
);

// DELETE /companies/:companyId/categories/:id - Eliminar categoría
router.delete(
  '/companies/:companyId/categories/:id',
  auditMiddleware('DELETE', 'CATEGORY'),
  categoriesController.deleteCategory
);

export default router;