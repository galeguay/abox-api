import { Router } from 'express';
import {
  createAndAssignUser,
  getCompanyUsers,
  updateRole,
  deleteMember 
} from './users.controller.js';

import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { createUserValidator, updateRoleValidator } from './users.validator.js';


const router = Router();
router.use(authMiddleware);

// Crear y asignar usuario
router.post(
  '/',
  requireRole(['OWNER', 'ADMIN']),
  createUserValidator,
  validateFields,
  createAndAssignUser
);

// Listar usuarios
router.get(
  '/company',
  requireRole(['OWNER', 'ADMIN']),
  getCompanyUsers
);

// Actualizar rol
router.patch(
  '/company/role',
  requireRole(['OWNER', 'ADMIN']),
  updateRoleValidator,
  updateRole
);

// Remover usuario
router.delete(
  '/company/:userId',
  requireRole(['OWNER', 'ADMIN']),
  deleteMember
);

export default router;