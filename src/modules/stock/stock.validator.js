import { body, query, param } from 'express-validator';

// Validador para crear/actualizar producto
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

// Validador para listar productos
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

// Validador para crear almacén
export const createWarehouseValidator = [
  body('name')
    .notEmpty()
    .withMessage('name es requerido')
    .isLength({ min: 2 })
    .withMessage('name debe tener al menos 2 caracteres'),
];

export const updateWarehouseValidator = [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('name debe tener al menos 2 caracteres'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('active debe ser un booleano'),
];

// Validador para listar almacenes
export const listWarehousesValidator = [
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

// Validador para movimiento de stock
export const createStockMovementValidator = [
  body('productId')
    .notEmpty()
    .withMessage('productId es requerido'),
  body('warehouseId')
    .notEmpty()
    .withMessage('warehouseId es requerido'),
  body('type')
    .notEmpty()
    .isIn(['IN', 'OUT', 'ADJUST'])
    .withMessage('type debe ser IN, OUT o ADJUST'),
  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('quantity debe ser mayor a 0'),
  body('reference')
    .optional()
    .isLength({ min: 1 })
    .withMessage('reference no puede estar vacío'),
  body('notes')
    .optional()
    .isLength({ min: 1 })
    .withMessage('notes no puede estar vacío'),
];

// Validador para transferencia de stock
export const transferStockValidator = [
  body('productId')
    .notEmpty()
    .withMessage('productId es requerido'),
  body('fromWarehouseId')
    .notEmpty()
    .withMessage('fromWarehouseId es requerido'),
  body('toWarehouseId')
    .notEmpty()
    .withMessage('toWarehouseId es requerido'),
  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('quantity debe ser mayor a 0'),
  body('notes')
    .optional()
    .isLength({ min: 1 })
    .withMessage('notes no puede estar vacío'),
];

// Validador para listar movimientos
export const listStockMovementsValidator = [
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
    .withMessage('type debe ser IN, OUT, ADJUST o TRANSFER'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate debe ser una fecha válida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate debe ser una fecha válida'),
];

// Validador para obtener stock
export const getStockValidator = [
  param('companyId')
    .notEmpty()
    .withMessage('companyId es requerido'),
  param('productId')
    .notEmpty()
    .withMessage('productId es requerido'),
];
