import { query } from 'express-validator';

export const listAuditLogsValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe estar entre 1 y 100'),
  query('action')
    .optional()
    .isIn(['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'])
    .withMessage('action debe ser uno de: CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT'),
  query('resource')
    .optional()
    .notEmpty()
    .withMessage('resource no puede estar vacío'),
  query('userId')
    .optional()
    .notEmpty()
    .withMessage('userId no puede estar vacío'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate debe ser una fecha válida'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate debe ser una fecha válida'),
];
