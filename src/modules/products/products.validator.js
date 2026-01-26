import { body, query } from 'express-validator';

export const createProductValidator = [
  body('name')
    .notEmpty()
    .withMessage('name es requerido')
    .isLength({ min: 2 })
    .withMessage('name debe tener al menos 2 caracteres'),
  body('sku')
    .optional()
    .isLength({ min: 2 })
    .withMessage('sku debe tener al menos 2 caracteres'),
];

export const updateProductValidator = [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('name debe tener al menos 2 caracteres'),
  body('sku')
    .optional()
    .isLength({ min: 2 })
    .withMessage('sku debe tener al menos 2 caracteres'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('active debe ser un booleano'),
];

export const listProductsValidator = [
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
    .isLength({ min: 1 })
    .withMessage('search no puede estar vacío'),
];
