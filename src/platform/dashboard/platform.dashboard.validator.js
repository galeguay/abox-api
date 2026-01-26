import { query } from 'express-validator';

export const getMetricsByPeriodValidator = [
  query('startDate')
    .notEmpty()
    .withMessage('startDate es requerido')
    .isISO8601()
    .withMessage('startDate debe ser una fecha válida (ISO 8601)'),
  query('endDate')
    .notEmpty()
    .withMessage('endDate es requerido')
    .isISO8601()
    .withMessage('endDate debe ser una fecha válida (ISO 8601)'),
];

export const paginationValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100'),
  query('days')
    .optional()
    .isInt({ min: 1 })
    .withMessage('days debe ser un número entero mayor a 0'),
];
