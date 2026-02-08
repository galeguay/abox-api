import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';

import * as dashboardController from './dashboard.controller.js';
import { getDashboardValidator } from './dashboard.validator.js';

const router = Router();

// Middleware global para todas las rutas de dashboard
router.use(authMiddleware('COMPANY'));[cite_start]// [cite: 9]

// Solo roles gerenciales pueden ver el dashboard
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));[cite_start]// [cite: 71]

// GET /companies/:companyId/dashboard - Resumen principal
router.get(
    '/companies/:companyId/dashboard',
    getDashboardValidator,
    validateFields,
    //auditMiddleware('READ', 'DASHBOARD'), // Registramos quién vio el dashboard
    dashboardController.getDashboardStats
);

export default router;