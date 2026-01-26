import { Router } from 'express';
import {
  getSettings,
  getSettingsByCategory,
  updateSettings,
  updateEmailSettings,
  testEmailConnection,
  sendTestEmail,
  getPublicSettings,
  backupSettings,
  listBackups,
  restoreSettings,
  resetToDefaults,
} from './platform.settings.controller.js';
import validateFields from '../../middlewares/validateFields.js';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';
import {
  updateSettingsValidator,
  updateEmailSettingsValidator,
  testEmailValidator,
  restoreBackupValidator,
} from './platform.settings.validator.js';

const router = Router();

// Rutas públicas (sin autenticación)
router.get('/public', getPublicSettings);

// Rutas protegidas (solo admin)
router.use(authMiddleware('PLATFORM'));
router.use(requireRole('ADMIN'));

// GET /platform/settings - Obtener todas las configuraciones
router.get('/', auditMiddleware('READ', 'SETTINGS'), getSettings);

// GET /platform/settings/:category - Obtener una categoría específica
router.get('/:category', auditMiddleware('READ', 'SETTINGS'), getSettingsByCategory);

// PUT /platform/settings/:category - Actualizar una categoría
router.put(
  '/:category',
  updateSettingsValidator,
  validateFields,
  auditMiddleware('UPDATE', 'SETTINGS'),
  updateSettings
);

// PUT /platform/settings/email/config - Actualizar configuración de email
router.put(
  '/email/config',
  updateEmailSettingsValidator,
  validateFields,
  auditMiddleware('UPDATE', 'SETTINGS_EMAIL'),
  updateEmailSettings
);

// POST /platform/settings/email/test-connection - Probar conexión de email
router.post(
  '/email/test-connection',
  updateEmailSettingsValidator,
  validateFields,
  testEmailConnection
);

// POST /platform/settings/email/test-send - Enviar email de prueba
router.post(
  '/email/test-send',
  testEmailValidator,
  validateFields,
  auditMiddleware('CREATE', 'SETTINGS_TEST_EMAIL'),
  sendTestEmail
);

// POST /platform/settings/backup - Crear backup
router.post(
  '/backup',
  auditMiddleware('CREATE', 'SETTINGS_BACKUP'),
  backupSettings
);

// GET /platform/settings/backups/list - Listar backups
router.get('/backups/list', auditMiddleware('READ', 'SETTINGS_BACKUP'), listBackups);

// POST /platform/settings/restore - Restaurar desde backup
router.post(
  '/restore',
  restoreBackupValidator,
  validateFields,
  auditMiddleware('UPDATE', 'SETTINGS_RESTORE'),
  restoreSettings
);

// POST /platform/settings/reset - Resetear a valores por defecto
router.post(
  '/reset',
  auditMiddleware('UPDATE', 'SETTINGS_RESET'),
  resetToDefaults
);

export default router;
