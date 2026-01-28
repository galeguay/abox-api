import { body, query, param } from 'express-validator';

// ==================== QUERY VALIDATORS (Listados) ====================

export const listStockMovementsValidator = [
    param('companyId')
        .isUUID()
        .withMessage('El ID de la compañía debe ser un UUID válido'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('page debe ser un número entero mayor a 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('limit debe estar entre 1 y 100'),

    query('type')
        .optional()
        .isIn(['IN', 'OUT', 'ADJUST', 'TRANSFER'])
        .withMessage('El tipo debe ser IN, OUT, ADJUST o TRANSFER'),

    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('startDate debe ser una fecha válida (ISO8601)'),

    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('endDate debe ser una fecha válida (ISO8601)'),

    query('productId')
        .optional()
        .isUUID()
        .withMessage('productId debe ser un UUID válido'),

    query('warehouseId')
        .optional()
        .isUUID()
        .withMessage('warehouseId debe ser un UUID válido'),
];

// ==================== BODY VALIDATORS (Creación) ====================

export const createStockMovementValidator = [
    param('companyId')
        .isUUID()
        .withMessage('El ID de la compañía es inválido'),

    body('productId')
        .notEmpty().withMessage('El producto es requerido')
        .isUUID().withMessage('productId inválido'),

    body('warehouseId')
        .notEmpty().withMessage('El almacén es requerido')
        .isUUID().withMessage('warehouseId inválido'),

    body('type')
        .notEmpty()
        .isIn(['IN', 'OUT', 'ADJUST'])
        .withMessage('El tipo debe ser IN, OUT o ADJUST'),

    body('quantity')
        .exists().withMessage('La cantidad es requerida')
        .isFloat({ min: 0.0001 }) // Permitimos decimales pequeños
        .withMessage('La cantidad debe ser mayor a 0'),

    body('notes')
        .optional()
        .isString()
        .isLength({ max: 500 })
        .withMessage('Las notas no pueden exceder 500 caracteres'),
];

export const transferStockValidator = [
    param('companyId')
        .isUUID()
        .withMessage('El ID de la compañía es inválido'),

    body('productId')
        .notEmpty().withMessage('El producto es requerido')
        .isUUID().withMessage('productId inválido'),

    body('fromWarehouseId')
        .notEmpty().withMessage('El almacén de origen es requerido')
        .isUUID().withMessage('fromWarehouseId inválido'),

    body('toWarehouseId')
        .notEmpty().withMessage('El almacén de destino es requerido')
        .isUUID().withMessage('toWarehouseId inválido')
        .custom((value, { req }) => {
            if (value === req.body.fromWarehouseId) {
                throw new Error('El almacén de destino no puede ser igual al de origen');
            }
            return true;
        }),

    body('quantity')
        .exists()
        .isFloat({ min: 0.0001 })
        .withMessage('La cantidad debe ser mayor a 0'),
];