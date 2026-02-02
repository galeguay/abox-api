import { body } from 'express-validator';

export const registerValidator = [
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
];

export const loginValidator = [
    body('email').isEmail(),
    body('password').notEmpty(),
];

export const selectCompanyValidator = [
    body('identityToken').notEmpty().withMessage('Token de identidad requerido'),
    body('companyId').isUUID().withMessage('ID de empresa inválido'),
];

export const forgotPasswordValidator = [
    body('email').isEmail(),
];

export const resetPasswordValidator = [
    body('token').notEmpty(),
    body('password').isLength({ min: 6 }),
];
