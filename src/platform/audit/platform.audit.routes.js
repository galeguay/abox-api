import { Router } from 'express';
import {
  getAuditLogs,
  getAuditLog,
  getAuditStats,
  exportAuditLogs,
} from './platform.audit.controller.js';
import validateFields from '../../middlewares/validateFields.js';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import { listAuditLogsValidator } from './platform.audit.validator.js';

const router = Router();

// Middleware para proteger todas las rutas
router.use(authMiddleware('PLATFORM'));
router.use(requireRole('ADMIN'));

// GET /platform/audit/logs - Listar logs de auditoría
router.get('/logs', listAuditLogsValidator, validateFields, getAuditLogs);

// GET /platform/audit/logs/:id - Obtener un log específico
router.get('/logs/:id', getAuditLog);

// GET /platform/audit/stats - Obtener estadísticas de auditoría
router.get('/stats', getAuditStats);

// GET /platform/audit/export - Exportar logs a CSV
router.get('/export', listAuditLogsValidator, validateFields, exportAuditLogs);

export default router;
