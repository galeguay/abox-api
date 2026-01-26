import { body, query, param } from 'express-validator';

export const createOrderValidator = [
    body('customerId')
        .optional()
        .isUUID()
        .withMessage('customerId debe ser un UUID válido'),
    body('items')
        .isArray({ min: 1 })
        .withMessage('items debe ser un array con al menos 1 elemento'),
    body('items.*.productId')
        .notEmpty()
        .withMessage('productId es requerido'),
    body('items.*.quantity')
        .isFloat({ min: 0.01 })
        .withMessage('quantity debe ser mayor a 0'),
    body('items.*.basePrice')
        .isFloat({ min: 0 })
        .withMessage('basePrice debe ser válido'),
    body('deliveryFee')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('deliveryFee debe ser un número mayor o igual a 0'),
    body('deliveryZoneId')
        .optional()
        .isUUID()
        .withMessage('deliveryZoneId debe ser un UUID válido'),
    body('discount')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('discount debe ser mayor o igual a 0'),
    // orders.validator.js
    body('warehouseId')
        .notEmpty()
        .isUUID()
        .withMessage('El warehouseId es obligatorio y debe ser un UUID válido'),
    body('notes')
        .optional()
        .isString()
        .withMessage('Las notas deben ser texto')
        .isLength({ max: 500 }) // Opcional: limitar el largo
        .withMessage('La nota es muy larga'),
];

export const updateOrderStatusValidator = [
    body('status')
        .notEmpty()
        .isIn(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELED'])
        .withMessage('status debe ser uno de: PENDING, CONFIRMED, PREPARING, READY, DELIVERED, CANCELED'),
];

export const addOrderItemValidator = [
    body('productId')
        .notEmpty()
        .withMessage('productId es requerido'),
    body('quantity')
        .isFloat({ min: 0.01 })
        .withMessage('quantity debe ser mayor a 0'),
    body('basePrice')
        .isFloat({ min: 0 })
        .withMessage('basePrice debe ser válido'),
];

export const addOrderPaymentValidator = [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('amount debe ser mayor a 0'),
    body('paymentMethod')
        .notEmpty()
        .isIn(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'VIRTUAL'])
        .withMessage('paymentMethod debe ser uno de: CASH, CARD, TRANSFER, CHECK, VIRTUAL'),
    body('reference')
        .optional()
        .isLength({ min: 1 })
        .withMessage('reference no puede estar vacío'),
];

export const listOrdersValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page debe ser un número entero mayor a 0'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit debe estar entre 1 y 100'),
    query('status')
        .optional()
        .isIn(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELED'])
        .withMessage('status inválido'),
    query('paymentStatus')
        .optional()
        .isIn(['OPEN', 'PENDING', 'PAID'])
        .withMessage('paymentStatus inválido'),
];

export const updateOrderDetailsValidator = [
    body('notes').optional().isString().withMessage('Las notas deben ser texto'),
    body('deliveryFee').optional().isFloat({ min: 0 }).withMessage('El deliveryFee debe ser mayor o igual a 0'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('El descuento debe ser mayor o igual a 0'),
];