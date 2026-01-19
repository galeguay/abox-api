import { body } from 'express-validator';

export const updateMeValidator = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
];

export const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('La contraseña actual es obligatoria'),

  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
];

export const updateUserValidator = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
    
  body('active')
    .optional()
    .isBoolean()
    .withMessage('El campo active debe ser un booleano'),
];
