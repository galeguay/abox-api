import { query } from 'express-validator';

export const getDashboardValidator = [
    query('days')
        .optional()
        .isInt({ min: 1, max: 365 })
        .withMessage('days debe ser un número entre 1 y 365'),

    // Si quisieras permitir filtrar "deadStock" por días mínimos
    query('minIdleDays')
        .optional()
        .isInt({ min: 1 })
        .withMessage('minIdleDays debe ser un número entero positivo')
];