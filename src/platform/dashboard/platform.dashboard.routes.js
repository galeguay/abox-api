import { Router } from 'express';
import {
  getDashboardStats,
  getTopCompanies,
  getRecentActivity,
  getMetricsByPeriod,
  getUserDistribution,
  getSalesByCompany,
  getExecutiveSummary,
} from './platform.dashboard.controller.js';
import validateFields from '../../middlewares/validateFields.js';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import {
  getMetricsByPeriodValidator,
  paginationValidator,
} from './platform.dashboard.validator.js';

const router = Router();

// Middleware para proteger todas las rutas
router.use(authMiddleware('PLATFORM'));
router.use(requireRole('ADMIN'));

// GET /platform/dashboard/stats - Obtener estadísticas generales
router.get('/stats', getDashboardStats);

// GET /platform/dashboard/executive-summary - Resumen ejecutivo
router.get('/executive-summary', getExecutiveSummary);

// GET /platform/dashboard/top-companies - Compañías con mejor desempeño
router.get('/top-companies', paginationValidator, validateFields, getTopCompanies);

// GET /platform/dashboard/recent-activity - Actividad reciente
router.get('/recent-activity', paginationValidator, validateFields, getRecentActivity);

// GET /platform/dashboard/metrics - Métricas por período
router.get(
  '/metrics',
  getMetricsByPeriodValidator,
  validateFields,
  getMetricsByPeriod
);

// GET /platform/dashboard/user-distribution - Distribución de usuarios
router.get(
  '/user-distribution',
  paginationValidator,
  validateFields,
  getUserDistribution
);

// GET /platform/dashboard/sales-by-company - Ventas por compañía
router.get(
  '/sales-by-company',
  paginationValidator,
  validateFields,
  getSalesByCompany
);

export default router;
