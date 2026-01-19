import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { emailUniqueOnCreate } from '../../middlewares/emailUnique.js';

import {
    createAndAssignUser,
    getCompanyUsers,
    updateRole,
    deleteMember,
} from './company-users.controller.js';

import {
    createUserValidator,
    updateRoleValidator,
} from './company-users.validator.js';

const router = Router();
router.use(authMiddleware);

// Listar usuarios de la empresa
router.get(
    '/companies/:companyId/users',
    requireRole(['OWNER', 'ADMIN']),
    getCompanyUsers
);

// Crear y asignar usuario a empresa
router.post(
    '/companies/:companyId/users',
    requireRole(['OWNER', 'ADMIN']),
    createUserValidator,
    validateFields,
    emailUniqueOnCreate(),
    createAndAssignUser
);

// Cambiar rol
router.patch(
    '/companies/:companyId/users/:userId/role',
    requireRole(['OWNER', 'ADMIN']),
    updateRoleValidator,
    validateFields,
    updateRole
);

// Quitar usuario de la empresa
router.delete(
    '/companies/:companyId/users/:userId',
    requireRole(['OWNER', 'ADMIN']),
    deleteMember
);

export default router;
