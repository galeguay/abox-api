import { Router } from 'express';
import validateFields from '../../middlewares/validateFields.js';
import { emailUniqueOnCreate } from '../../middlewares/emailUnique.js';

import {
    login,
    register,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
} from './auth.controller.js';

import {
    loginValidator,
    registerValidator,
    forgotPasswordValidator,
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

// Login
router.post(
    '/login',
    loginValidator,
    validateFields,
    login
);

// Refresh token
router.post('/refresh', refreshToken);

// Logout
router.post('/logout', logout);

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
