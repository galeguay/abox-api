import { body, query } from 'express-validator';

export const updateSettingsValidator = [
  body('platform.name')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Nombre de plataforma no puede estar vacío'),
  body('platform.environment')
    .optional()
    .isIn(['production', 'staging', 'development'])
    .withMessage('Environment debe ser production, staging o development'),
  body('platform.timezone')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Timezone no puede estar vacío'),
  body('security.passwordPolicy.minLength')
    .optional()
    .isInt({ min: 6, max: 20 })
    .withMessage('minLength debe estar entre 6 y 20'),
  body('security.sessionTimeout')
    .optional()
    .isInt({ min: 300 })
    .withMessage('sessionTimeout debe ser mayor a 300 segundos'),
  body('security.maxLoginAttempts')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('maxLoginAttempts debe estar entre 1 y 10'),
];

export const updateEmailSettingsValidator = [
  body('host')
    .notEmpty()
    .withMessage('host es requerido'),
  body('port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('port debe ser un número válido entre 1 y 65535'),
  body('secure')
    .isBoolean()
    .withMessage('secure debe ser un booleano'),
  body('user')
    .notEmpty()
    .withMessage('user es requerido'),
  body('pass')
    .notEmpty()
    .withMessage('pass es requerido'),
  body('from')
    .isEmail()
    .withMessage('from debe ser un email válido'),
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled debe ser un booleano'),
];

export const testEmailValidator = [
  body('toEmail')
    .isEmail()
    .withMessage('toEmail debe ser un email válido'),
];

export const restoreBackupValidator = [
  body('backupFileName')
    .notEmpty()
    .withMessage('backupFileName es requerido'),
];
