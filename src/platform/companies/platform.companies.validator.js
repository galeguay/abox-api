import { body, query } from 'express-validator';

// Validador para crear una compañía
export const createCompanyValidator = [
  body('name')
    .notEmpty()
    .withMessage('name es requerido')
    .isLength({ min: 2 })
    .withMessage('name debe tener al menos 2 caracteres'),
];

// Validador para actualizar una compañía
export const updateCompanyValidator = [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('name debe tener al menos 2 caracteres'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('active debe ser un booleano'),
];

// Validador para listar compañías con paginación y filtros
export const listCompaniesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100'),
  query('active')
    .optional()
    .isBoolean()
    .withMessage('active debe ser un booleano'),
];

// Validador para asignar un usuario a una compañía
export const assignUserToCompanyValidator = [
  body('userId')
    .notEmpty()
    .withMessage('userId es requerido'),
  body('role')
    .notEmpty()
    .withMessage('role es requerido')
    .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'])
    .withMessage('role debe ser uno de: ADMIN, MANAGER, EMPLOYEE, VIEWER'),
];
