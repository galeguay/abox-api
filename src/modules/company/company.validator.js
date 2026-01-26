import { body, validationResult } from 'express-validator';

export const validateUpdateCompanyProfile = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('El nombre debe tener entre 3 y 255 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Formato de teléfono inválido'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email inválido'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La dirección no puede exceder 500 caracteres'),
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La ciudad no puede exceder 100 caracteres'),
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El estado/provincia no puede exceder 100 caracteres'),
  body('zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('El código postal no puede exceder 20 caracteres'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El país no puede exceder 100 caracteres'),
];

export const validateUpdateCompanySettings = [
  body('operationalHours')
    .optional()
    .isObject()
    .withMessage('Las horas operacionales deben ser un objeto'),
  body('operationalHours.*.dayOfWeek')
    .optional()
    .isIn(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
    .withMessage('Día de la semana inválido'),
  body('operationalHours.*.openTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora inválido (HH:mm)'),
  body('operationalHours.*.closeTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora inválido (HH:mm)'),
  body('internalPolicies')
    .optional()
    .isObject()
    .withMessage('Las políticas internas deben ser un objeto'),
  body('internalPolicies.maxDiscountPercentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('El porcentaje máximo de descuento debe estar entre 0 y 100'),
  body('internalPolicies.requiresApprovalForRefunds')
    .optional()
    .isBoolean()
    .withMessage('requiresApprovalForRefunds debe ser booleano'),
  body('internalPolicies.defaultTaxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La tasa de impuesto debe estar entre 0 y 100'),
];

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};
