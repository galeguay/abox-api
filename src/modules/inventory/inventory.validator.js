import { param, query } from 'express-validator';

export const getStockValidator = [
    param('companyId')
        .notEmpty()
        .withMessage('companyId es requerido'),
    param('productId')
        .notEmpty()
        .withMessage('productId es requerido'),
    query('warehouseId')
        .notEmpty()
        .withMessage('warehouseId es requerido como parámetro de consulta')
        .isUUID()
        .withMessage('warehouseId debe ser un UUID válido'),
];

export const getTotalStockValidator = [
    param('companyId')
        .notEmpty()
        .withMessage('companyId es requerido'),
    param('productId')
        .notEmpty()
        .withMessage('productId es requerido'),
];

export const getInventoryReportValidator = [
    param('companyId').notEmpty().withMessage('companyId es requerido'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('categoryId')
        .optional()
        .isUUID()
        .withMessage('categoryId debe ser un UUID válido'),
];