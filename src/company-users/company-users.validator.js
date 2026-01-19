import { body } from 'express-validator';

// Crear usuario y asignarlo a una empresa
export const createUserValidator = [
    body('email')
        .isEmail()
        .withMessage('Email inválido'),

    body('role')
        .isIn(['OWNER', 'ADMIN', 'USER'])
        .withMessage('Rol inválido'),
];

// Actualizar rol dentro de la empresa
export const updateRoleValidator = [
    body('role')
        .isIn(['OWNER', 'ADMIN', 'USER'])
        .withMessage('Rol inválido'),
];