import { body, query } from 'express-validator';

export const createCategoryValidator = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
];

export const updateCategoryValidator = [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('El nombre debe tener al menos 2 caracteres'),
];

export const listCategoriesValidator = [
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
    .isLength({ min: 1 })
    .withMessage('search no puede estar vacío'),
];