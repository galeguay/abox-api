import { body, param, query } from 'express-validator';

export const createCategoryValidator = [
    body('name')
        .notEmpty()
        .withMessage('El nombre de la categoría es obligatorio')
        .isString()
        .trim()
        .isLength({ max: 50 })
        .withMessage('El nombre no puede exceder 50 caracteres'),
    body('color')
        .optional()
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .withMessage('El color debe ser un string (HEX o nombre)'),
];

export const updateCategoryValidator = [
    param('id').isUUID().withMessage('ID de categoría inválido'),
    body('name')
        .optional()
        .notEmpty()
        .withMessage('El nombre no puede estar vacío')
        .trim(),
    body('color')
        .optional()
        .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
        .withMessage('El color debe ser un string (HEX o nombre)'),
    body('active')
        .optional()
        .isBoolean()
        .withMessage('El campo active debe ser booleano')
];

export const getCategoryValidator = [
    param('id').isUUID().withMessage('ID de categoría inválido'),
];