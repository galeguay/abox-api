import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import * as categoryController from './sales-categories.controller.js';
import {
    createCategoryValidator,
    updateCategoryValidator,
    getCategoryValidator
} from './sales-categories.validator.js';

const router = Router();

// Middleware global de autenticación para estas rutas
router.use(authMiddleware('COMPANY'));

// 1. Listar (Permitimos a SELLER para que pueda seleccionarla en la venta)
router.get(
    '/companies/:companyId/sales-categories',
    requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SELLER']), 
    categoryController.getCategories
);

// 2. Obtener una (Permitimos a SELLER también)
router.get(
    '/companies/:companyId/sales-categories/:id',
    requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SELLER']),
    getCategoryValidator,
    validateFields,
    categoryController.getCategoryById
);

// 3. Crear (Solo Admin/Manager/Owner)
router.post(
    '/companies/:companyId/sales-categories',
    requireRole(['OWNER', 'ADMIN', 'MANAGER']),
    createCategoryValidator,
    validateFields,
    categoryController.createCategory
);

// 4. Actualizar
router.put(
    '/companies/:companyId/sales-categories/:id',
    requireRole(['OWNER', 'ADMIN', 'MANAGER']),
    updateCategoryValidator,
    validateFields,
    categoryController.updateCategory
);

// 5. Eliminar (Soft Delete)
router.delete(
    '/companies/:companyId/sales-categories/:id',
    requireRole(['OWNER', 'ADMIN', 'MANAGER']),
    getCategoryValidator, // Validamos que el ID sea UUID
    validateFields,
    categoryController.deleteCategory
);

export default router;