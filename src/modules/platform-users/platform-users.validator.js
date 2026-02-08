import { body, query } from 'express-validator';

export const getUsersValidator = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero mayor a 0')
        .toInt(),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entre 1 y 100')
        .toInt(),
    query('search')
        .optional()
        .isString()
        .trim()
        .withMessage('El término de búsqueda debe ser un texto'),
    query('type')
        .optional()
        .isIn(['COMPANY', 'PLATFORM'])
        .withMessage('El tipo de usuario no es válido')
];

export const createUserValidator = [
    body('firstName')
        .trim()
        .notEmpty().withMessage('El nombre es requerido'),
    body('lastName')
        .trim()
        .notEmpty().withMessage('El apellido es requerido'),
    body('email')
        .trim()
        .isEmail().withMessage('Debe ser un email válido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('type')
        .optional()
        .isIn(['PLATFORM', 'COMPANY']).withMessage('Tipo de usuario inválido'),
    body('companyId')
        .optional()
        .isUUID().withMessage('ID de empresa inválido'),
    body('role')
        .optional()
        .isIn(['OWNER', 'ADMIN', 'EMPLOYEE', 'READ_ONLY', 'MANAGER']),
];