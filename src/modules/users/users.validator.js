import { body } from 'express-validator';

// Validaciones para crear usuario
export const createUserValidator = [
    body('email')
        .isEmail()
        .withMessage('Email inválido'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password mínimo 6 caracteres')
];

// Validaciones para agregar usuario a empresa
export const addUserToCompanyValidator = [
    body('userId')
        .isUUID()
        .withMessage('userId inválido'),

    body('companyId')
        .isUUID()
        .withMessage('companyId inválido'),

    body('role')
        .isIn(['OWNER', 'ADMIN'])
        .withMessage('Rol inválido')
];

export const updateRoleValidator = [
    body('userId')
        .isUUID()
        .withMessage('userId debe ser un UUID válido'),

    body('role')
        .isIn(['OWNER', 'ADMIN'])
        .withMessage('El rol proporcionado no es válido')
];
