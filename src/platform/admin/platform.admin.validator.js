import { body, query } from 'express-validator';

// Validador para crear un usuario admin
export const createAdminValidator = [
  body('email')
    .isEmail()
    .withMessage('Email debe ser un correo válido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password debe tener al menos 6 caracteres'),
  body('firstName')
    .notEmpty()
    .withMessage('firstName es requerido'),
  body('lastName')
    .notEmpty()
    .withMessage('lastName es requerido'),
];

// Validador para actualizar un usuario admin
export const updateAdminValidator = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email debe ser un correo válido'),
  body('firstName')
    .optional()
    .notEmpty()
    .withMessage('firstName no puede estar vacío'),
  body('lastName')
    .optional()
    .notEmpty()
    .withMessage('lastName no puede estar vacío'),
];

// Validador para listar admins con paginación
export const listAdminsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100'),
];
