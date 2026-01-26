import { body, query, param } from 'express-validator';

export const createMoneyMovementValidator = [
  body('type')
    .notEmpty()
    .isIn(['IN', 'OUT'])
    .withMessage('type debe ser IN u OUT'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('amount debe ser mayor a 0'),
  body('paymentMethod')
    .notEmpty()
    .isIn(['CASH', 'CARD', 'TRANSFER', 'VIRTUAL', 'CHECK', 'OTHER'])
    .withMessage('paymentMethod inválido'),
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('categoryId debe ser un UUID válido'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('description no puede exceder 500 caracteres'),
  body('reference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('reference no puede exceder 100 caracteres'),
  body('referenceType')
    .optional()
    .isIn(['SALE', 'ORDER', 'CASH_SESSION', 'PURCHASE', 'OTHER'])
    .withMessage('referenceType inválido'),
];

export const updateMoneyMovementValidator = [
  body('type')
    .optional()
    .isIn(['IN', 'OUT'])
    .withMessage('type debe ser IN u OUT'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('amount debe ser mayor a 0'),
  body('paymentMethod')
    .optional()
    .isIn(['CASH', 'CARD', 'TRANSFER', 'VIRTUAL', 'CHECK', 'OTHER'])
    .withMessage('paymentMethod inválido'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('description no puede exceder 500 caracteres'),
];

export const listMoneyMovementsValidator = [
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
    .isIn(['IN', 'OUT'])
    .withMessage('type debe ser IN u OUT'),
  query('paymentMethod')
    .optional()
    .isIn(['CASH', 'CARD', 'TRANSFER', 'VIRTUAL', 'CHECK', 'OTHER'])
    .withMessage('paymentMethod inválido'),
  query('categoryId')
    .optional()
    .isUUID()
    .withMessage('categoryId debe ser un UUID válido'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate debe ser una fecha válida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate debe ser una fecha válida'),
];
