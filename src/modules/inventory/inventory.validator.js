import { param } from 'express-validator';

export const getStockValidator = [
  param('companyId')
    .notEmpty()
    .withMessage('companyId es requerido'),
  param('productId')
    .notEmpty()
    .withMessage('productId es requerido'),
];

export const getTotalStockValidator = [
  param('companyId')
    .notEmpty()
    .withMessage('companyId es requerido'),
  param('productId')
    .notEmpty()
    .withMessage('productId es requerido'),
];
