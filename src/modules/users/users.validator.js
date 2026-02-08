import { body, query } from 'express-validator';
import { AVAILABLE_ROLES } from '../../constants/roles.js';

export const updateMeValidator = [
    body('firstName')
        .optional()
        .isLength({ min: 1 })
        .withMessage('firstName no puede estar vacío'),
    body('lastName')
        .optional()
        .isLength({ min: 1 })
        .withMessage('lastName no puede estar vacío'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('phone debe ser un número telefónico válido'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email inválido'),
];

export const setupPasswordValidator = [
    body('token')
        .notEmpty()
        .withMessage('El token es obligatorio'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('Debe contener al menos una mayúscula')
        .matches(/[0-9]/)
        .withMessage('Debe contener al menos un número'),
];

export const changePasswordValidator = [
    body('currentPassword')
        .notEmpty()
        .withMessage('La contraseña actual es obligatoria'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('newPassword debe contener al menos una mayúscula')
        .matches(/[0-9]/)
        .withMessage('newPassword debe contener al menos un número'),
];

export const updateUserValidator = [
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email inválido'),
    body('active')
        .optional()
        .isBoolean()
        .withMessage('El campo active debe ser un booleano'),
];

export const inviteUserValidator = [
    body('email')
        .isEmail()
        .withMessage('email debe ser un correo válido'),
    body('role')
        .notEmpty()
        .isIn(AVAILABLE_ROLES)
        .withMessage(`Rol inválido. Opciones: ${AVAILABLE_ROLES.join(', ')}`),
];

export const changeUserRoleValidator = [
    body('role')
        .notEmpty()
        .isIn(AVAILABLE_ROLES)
        .withMessage('Rol inválido'),
];
export const listUsersValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page debe ser un número entero mayor a 0'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit debe estar entre 1 y 100'),
    query('role')
        .optional()
        .isIn(AVAILABLE_ROLES)
        .withMessage('Rol inválido'),
    query('active')
        .optional()
        .isBoolean()
        .withMessage('active debe ser un booleano'),
];

export const adminListUsersValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page debe ser un número entero mayor a 0'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit debe estar entre 1 y 100'),
    query('search')
        .optional()
        .isString()
        .trim()
        .escape(),
];

export const switchCompanyValidator = [
    body('companyId')
        .notEmpty()
        .withMessage('companyId es requerido'),
];

export const createUserValidator = [
  body('email')
    .isEmail()
    .withMessage('email debe ser un correo válido'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('Debe contener al menos una mayúscula')
    .matches(/[0-9]/)
    .withMessage('Debe contener al menos un número'),

  body('firstName')
    .optional()
    .isLength({ min: 1 })
    .withMessage('firstName no puede estar vacío'),

  body('lastName')
    .optional()
    .isLength({ min: 1 })
    .withMessage('lastName no puede estar vacío'),

  body('type')
    .optional()
    .isIn(['PLATFORM', 'COMPANY'])
    .withMessage('type inválido. Opciones: PLATFORM, COMPANY'),

  body('active')
    .optional()
    .isBoolean()
    .withMessage('active debe ser un booleano'),
];
