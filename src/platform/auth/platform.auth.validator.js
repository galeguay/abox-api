import { body } from 'express-validator';

export const platformLoginValidator = [
  body('email')
    .isEmail()
    .withMessage('Email inválido'),

  body('password')
    .isString()
    .notEmpty()
    .withMessage('Password requerida')
];
