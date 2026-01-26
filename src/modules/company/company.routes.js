import express from 'express';
import * as companyController from './company.controller.js';
import { validateUpdateCompanyProfile, validateUpdateCompanySettings, handleValidationErrors } from './company.validator.js';
import { authMiddleware } from '../../middlewares/auth.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

const router = express.Router();

// Middleware para verificar autenticación
router.use(authMiddleware);

// GET /company/profile - Obtener perfil de mi empresa
router.get(
  '/profile',
  companyController.getMyCompanyProfile
);

// PUT /company/profile - Actualizar perfil de mi empresa
router.put(
  '/profile',
  validateUpdateCompanyProfile,
  handleValidationErrors,
  companyController.updateMyCompanyProfile
);

// GET /company/stats - Obtener estadísticas de mi empresa
router.get(
  '/stats',
  companyController.getMyCompanyStats
);

// GET /company/settings - Obtener configuración de mi empresa
router.get(
  '/settings',
  companyController.getMyCompanySettings
);

// PUT /company/settings - Actualizar configuración de mi empresa (solo ADMIN)
router.put(
  '/settings',
  validateUpdateCompanySettings,
  handleValidationErrors,
  companyController.updateMyCompanySettings
);

export default router;
