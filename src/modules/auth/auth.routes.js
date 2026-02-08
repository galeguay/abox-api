import { Router } from 'express';
import validateFields from '../../middlewares/validateFields.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { emailUniqueOnCreate } from '../../middlewares/emailUnique.js';

import {
    login,
    register,
    refreshToken,
    logout,
    forgotPassword,
    selectCompanyController,
    resetPassword,
    logoutAll,
    me
} from './auth.controller.js';

import {
    loginValidator,
    registerValidator,
    forgotPasswordValidator,
    selectCompanyValidator,
    resetPasswordValidator,
} from './auth.validator.js';

const router = Router();

// Registro (identidad básica)
router.post(
    '/register',
    registerValidator,
    validateFields,
    emailUniqueOnCreate(),
    register
);

router.post(
    '/login',
    loginValidator,
    validateFields,
    login);

router.post(
    '/select-company',
    selectCompanyValidator,
    validateFields,
    selectCompanyController);

router.get(
    "/me",
    authMiddleware(),
    me
);

// Refresh token
router.post('/refresh', refreshToken);

// Logout
router.post(
    '/logout',
    authMiddleware('COMPANY'),
    logout
);

router.post(
    '/logout-all',
    authMiddleware('COMPANY'),
    logoutAll
);

// Recuperación de contraseña
router.post(
    '/forgot-password',
    forgotPasswordValidator,
    validateFields,
    forgotPassword
);

router.post(
    '/reset-password',
    resetPasswordValidator,
    validateFields,
    resetPassword
);

export default router;
