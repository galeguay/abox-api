import { body, query } from 'express-validator';

// Validador para crear una compañía
export const createCompanyValidator = [
  body('name')
    .notEmpty()
    .withMessage('name es requerido')
    .isLength({ min: 2 })
    .withMessage('name debe tener al menos 2 caracteres'),
  
  // Nuevos campos
  body('taxId')
    .optional({ checkFalsy: true }) // Permite que sea null o string vacío, pero si tiene datos valida
    .isString()
    .trim()
    .withMessage('taxId debe ser un texto'),
  
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(), // Sanitización básica
  
  body('phone')
    .optional({ checkFalsy: true })
    .isString()
    .trim(),
  
  body('address')
    .optional({ checkFalsy: true })
    .isString()
    .trim(),
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

  // Nuevos campos para actualización
  body('taxId')
    .optional()
    .isString()
    .trim(),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Debe ser un email válido'),
  
  body('phone')
    .optional()
    .isString(),
    
  body('address')
    .optional()
    .isString(),
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
  query('search')
    .optional()
    .isString()
    .trim()
    .escape(),
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