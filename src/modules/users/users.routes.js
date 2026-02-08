import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { emailUniqueOnUpdate } from '../../middlewares/emailUnique.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from '../../constants/audit.constants.js';

import {
    getMe,
    updateMe,
    changePassword,
    createUser,
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
    setupPassword
} from './users.controller.js';

import {
    updateMeValidator,
    changePasswordValidator,
    updateUserValidator,
    inviteUserValidator,
    createUserValidator,
    changeUserRoleValidator,
    listUsersValidator,
    adminListUsersValidator,
    switchCompanyValidator,
    setupPasswordValidator
} from './users.validator.js';

const router = Router();

// POST /users/setup-password - Configurar contraseña por invitación
router.post(
    '/setup-password',
    setupPasswordValidator,
    validateFields,
    setupPassword
);

// Middleware global para rutas siguientes
router.use(authMiddleware());

// GET /users/me - Ver mi perfil
router.get(
    '/me',
    //auditMiddleware(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.USER_PROFILE),
    getMe
);

// PUT /users/me - Actualizar mi perfil
router.put(
    '/me',
    updateMeValidator,
    validateFields,
    emailUniqueOnUpdate({
        getUserId: (req) => req.user.id,
    }),
    //auditMiddleware(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.USER_PROFILE),
    updateMe
);

// PUT /users/me/password - Cambiar mi contraseña
router.put(
    '/me/password',
    changePasswordValidator,
    validateFields,
    //auditMiddleware(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.USER_PASSWORD),
    changePassword
);

// GET /users/me/companies - Ver mis empresas
router.get(
    '/me/companies',
    //auditMiddleware(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.USER_COMPANIES),
    getMyCompanies
);

// PUT /users/me/switch-company - Cambiar empresa activa
router.put(
    '/me/switch-company',
    switchCompanyValidator,
    validateFields,
    //auditMiddleware(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.ACTIVE_COMPANY),
    switchActiveCompany
);

// GET /users/me/permissions - Ver mis permisos
router.get(
    '/me/permissions',
    //auditMiddleware(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.USER_PERMISSIONS),
    getMyPermissions
);

// GET /users/roles - Listar roles disponibles
router.get('/roles', getAvailableRoles);

// GET /users/roles/:role/permissions - Obtener permisos de un rol
router.get('/roles/:role/permissions', getRolePermissions);

// Middleware para rutas de administración
router.use(requireRole(['OWNER', 'ADMIN']));

//Obtener todos los ususarios
router.get(
    '/',
    requireRole(['OWNER']),
    adminListUsersValidator,
    validateFields,
    getUsers
);

// GET /users/company/:companyId - Listar usuarios de empresa
router.get(
    '/company/:companyId',
    listUsersValidator,
    validateFields,
    //auditMiddleware(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.COMPANY_USERS),
    getCompanyUsers
);

// GET /users/company/:companyId/:userId - Obtener un usuario específico dentro de una empresa
router.get(
    '/company/:companyId/:userId',
    //auditMiddleware(AUDIT_ACTIONS.READ, AUDIT_RESOURCES.COMPANY_USER),
    getCompanyUserById
);

// POST /users/company/:companyId/invite - Invitar usuario a empresa
router.post(
    '/company/:companyId/invite',
    inviteUserValidator,
    validateFields,
    //auditMiddleware(AUDIT_ACTIONS.CREATE, AUDIT_RESOURCES.COMPANY_USER_INVITE),
    inviteUserToCompany
);

// PUT /users/company/:companyId/:userId/role - Cambiar rol de usuario
router.put(
    '/company/:companyId/:userId/role',
    changeUserRoleValidator,
    validateFields,
    //auditMiddleware(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.COMPANY_USER_ROLE),
    changeUserRole
);

// PATCH /users/company/:companyId/:userId/deactivate - Desactivar usuario
router.patch(
    '/company/:companyId/:userId/deactivate',
    //auditMiddleware(AUDIT_ACTIONS.UPDATE, AUDIT_RESOURCES.COMPANY_USER_DEACTIVATE),
    deactivateUserInCompany
);

// DELETE /users/company/:companyId/:userId - Remover usuario de empresa
router.delete(
    '/company/:companyId/:userId',
    //auditMiddleware(AUDIT_ACTIONS.DELETE, AUDIT_RESOURCES.COMPANY_USER),
    removeUserFromCompany
);


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