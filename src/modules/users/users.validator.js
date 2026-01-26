import { body, query } from 'express-validator';

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
    .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'])
    .withMessage('role debe ser uno de: ADMIN, MANAGER, EMPLOYEE, VIEWER'),
];

export const changeUserRoleValidator = [
  body('role')
    .notEmpty()
    .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'])
    .withMessage('role debe ser uno de: ADMIN, MANAGER, EMPLOYEE, VIEWER'),
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
    .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'])
    .withMessage('role debe ser uno de: ADMIN, MANAGER, EMPLOYEE, VIEWER'),
  query('active')
    .optional()
    .isBoolean()
    .withMessage('active debe ser un booleano'),
];

export const switchCompanyValidator = [
  body('companyId')
    .notEmpty()
    .withMessage('companyId es requerido'),
];
