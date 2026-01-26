import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { emailUniqueOnUpdate } from '../../middlewares/emailUnique.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import {
  getMe,
  updateMe,
  changePassword,
  getMyCompanies,
  switchActiveCompany,
  getMyPermissions,
  getCompanyUsers,
  getCompanyUserById,
  inviteUserToCompany,
  changeUserRole,
  deactivateUserInCompany,
  removeUserFromCompany,
  getAvailableRoles,
  getRolePermissions,
  activateUser,
  deactivateUser,
  getUsers,
  getUserById,
  updateUser,
} from './users.controller.js';

import {
  updateMeValidator,
  changePasswordValidator,
  updateUserValidator,
  inviteUserValidator,
  changeUserRoleValidator,
  listUsersValidator,
  switchCompanyValidator,
} from './users.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));


// GET /users/me - Ver mi perfil
router.get('/me', auditMiddleware('READ', 'USER_PROFILE'), getMe);

// PUT /users/me - Actualizar mi perfil
router.put(
  '/me',
  updateMeValidator,
  validateFields,
  emailUniqueOnUpdate({
    getUserId: (req) => req.user.sub,
  }),
  auditMiddleware('UPDATE', 'USER_PROFILE'),
  updateMe
);

// PUT /users/me/password - Cambiar mi contraseña
router.put(
  '/me/password',
  changePasswordValidator,
  validateFields,
  auditMiddleware('UPDATE', 'USER_PASSWORD'),
  changePassword
);

// GET /users/me/companies - Ver mis empresas
router.get('/me/companies', auditMiddleware('READ', 'USER_COMPANIES'), getMyCompanies);

// PUT /users/me/switch-company - Cambiar empresa activa
router.put(
  '/me/switch-company',
  switchCompanyValidator,
  validateFields,
  auditMiddleware('UPDATE', 'ACTIVE_COMPANY'),
  switchActiveCompany
);

// GET /users/me/permissions - Ver mis permisos
router.get(
  '/me/permissions',
  auditMiddleware('READ', 'USER_PERMISSIONS'),
  getMyPermissions
);

// GET /users/roles - Listar roles disponibles
router.get('/roles', getAvailableRoles);

// GET /users/roles/:role/permissions - Obtener permisos de un rol
router.get('/roles/:role/permissions', getRolePermissions);

router.use(requireRole(['OWNER', 'ADMIN']));

// GET /users/company/:companyId - Listar usuarios de empresa
router.get(
  '/company/:companyId',
  listUsersValidator,
  validateFields,
  auditMiddleware('READ', 'COMPANY_USERS'),
  getCompanyUsers
);

// GET /users/company/:companyId/:userId - Obtener un usuario específico
router.get(
  '/company/:companyId/:userId',
  auditMiddleware('READ', 'COMPANY_USER'),
  getCompanyUserById
);

// POST /users/company/:companyId/invite - Invitar usuario a empresa
router.post(
  '/company/:companyId/invite',
  inviteUserValidator,
  validateFields,
  auditMiddleware('CREATE', 'COMPANY_USER_INVITE'),
  inviteUserToCompany
);

// PUT /users/company/:companyId/:userId/role - Cambiar rol de usuario
router.put(
  '/company/:companyId/:userId/role',
  changeUserRoleValidator,
  validateFields,
  auditMiddleware('UPDATE', 'COMPANY_USER_ROLE'),
  changeUserRole
);

// PATCH /users/company/:companyId/:userId/deactivate - Desactivar usuario
router.patch(
  '/company/:companyId/:userId/deactivate',
  auditMiddleware('UPDATE', 'COMPANY_USER_DEACTIVATE'),
  deactivateUserInCompany
);

// DELETE /users/company/:companyId/:userId - Remover usuario de empresa
router.delete(
  '/company/:companyId/:userId',
  auditMiddleware('DELETE', 'COMPANY_USER'),
  removeUserFromCompany
);

router.get('/', requireRole(['OWNER']), getUsers);

router.get('/:id', requireRole(['OWNER', 'ADMIN']), getUserById);

router.put(
  '/:id',
  requireRole(['OWNER', 'ADMIN']),
  updateUserValidator,
  validateFields,
  emailUniqueOnUpdate({
    getUserId: (req) => req.params.id,
  }),
  updateUser
);

router.patch('/:id/activate', requireRole(['OWNER']), activateUser);

router.patch('/:id/deactivate', requireRole(['OWNER']), deactivateUser);

export default router;
