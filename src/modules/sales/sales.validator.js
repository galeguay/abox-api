import { body, query, param } from 'express-validator';

export const createSaleValidator = [
    body('warehouseId')
        .notEmpty()
        .isUUID()
        .withMessage('El warehouseId es obligatorio y debe ser un UUID válido'),
    body('customerId')
        .optional()
        .isUUID()
        .withMessage('customerId debe ser un UUID válido'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('La venta debe tener al menos un producto'),
    body('items.*.productId')
        .notEmpty()
        .withMessage('productId es requerido en cada item'),
    body('saleCategoryId')
        .optional()
        .isUUID()
        .withMessage('El ID de categoría de venta debe ser un UUID válido'),
    body('items.*.quantity')
        .isFloat({ min: 0.01 })
        .withMessage('La cantidad debe ser mayor a 0'),
    body('items.*.price')
        .isFloat({ min: 0 })
        .withMessage('El precio debe ser mayor o igual a 0'),
    body('items.*.discount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El descuento por item debe ser numérico'),
    body('discount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('El descuento general debe ser numérico'),
    body('payments')
        .optional()
        .isArray({ min: 1 })
        .withMessage('payments debe ser un array de pagos'),
    body('payments.*.paymentMethod')
        .notEmpty()
        .isIn(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'VIRTUAL']) // Asegúrate que coincida con tu Schema
        .withMessage('Método de pago inválido'),
    body('payments.*.amount')
        .isFloat({ min: 0.01 })
        .withMessage('El monto del pago debe ser mayor a 0'),
    body('updateStock')
        .optional()
        .isBoolean()
        .withMessage('updateStock debe ser booleano'),
];

export const listSalesValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page debe ser entero mayor a 0'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit debe estar entre 1 y 100'),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('startDate debe ser una fecha válida (ISO8601)'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('endDate debe ser una fecha válida (ISO8601)'),
    query('status')
        .optional()
        .isIn(['COMPLETED', 'CANCELED'])
        .withMessage('Estado inválido'),
    query('paymentStatus')
        .optional()
        .isIn(['PAID', 'PENDING'])
        .withMessage('Estado de pago inválido'),
];

export const cancelSaleValidator = [
    param('id').isUUID().withMessage('ID de venta inválido'),
    body('warehouseId')
        .optional()
        .isUUID()
        .withMessage('El warehouseId de devolución debe ser válido'),
];