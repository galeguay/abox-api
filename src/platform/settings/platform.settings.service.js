import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { logAction } from '../audit/platform.audit.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configDir = path.join(__dirname, '../../../config');
const settingsFile = path.join(configDir, 'settings.json');

// Configuración por defecto
const defaultSettings = {
  platform: {
    name: 'Abox Platform',
    version: '1.0.0',
    environment: 'production',
    timezone: 'UTC',
    language: 'es',
  },
  security: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    lockoutDuration: 900,
  },
  email: {
    enabled: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: true,
    auth: {
      user: '',
      pass: '',
    },
    from: 'noreply@abox.com',
  },
  integrations: {
    sentry: {
      enabled: false,
      dsn: '',
    },
    slack: {
      enabled: false,
      webhook: '',
    },
  },
  maintenance: {
    enabled: false,
    message: 'Sistema en mantenimiento',
    scheduledTime: null,
  },
};

// Asegurar que el directorio de configuración exista
const ensureConfigDirectory = () => {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
};

// Cargar configuraciones desde archivo
const loadSettings = () => {
  try {
    ensureConfigDirectory();
    if (fs.existsSync(settingsFile)) {
      const data = fs.readFileSync(settingsFile, 'utf-8');
      return JSON.parse(data);
    }
    // Si no existe, crear con valores por defecto
    saveSettings(defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('Error al cargar configuraciones:', error);
    return defaultSettings;
  }
};

// Guardar configuraciones en archivo
const saveSettings = (settings) => {
  try {
    ensureConfigDirectory();
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error al guardar configuraciones:', error);
    throw error;
  }
};

// Variable en memoria para almacenar settings actual
let currentSettings = loadSettings();

// Obtener todas las configuraciones (sin datos sensibles)
export const getSettings = () => {
  return {
    ...currentSettings,
    email: {
      ...currentSettings.email,
      auth: {
        user: currentSettings.email.auth.user ? '***' : '',
        pass: currentSettings.email.auth.pass ? '***' : '',
      },
    },
    integrations: {
      sentry: {
        ...currentSettings.integrations.sentry,
        dsn: currentSettings.integrations.sentry.dsn ? '***' : '',
      },
      slack: {
        ...currentSettings.integrations.slack,
        webhook: currentSettings.integrations.slack.webhook ? '***' : '',
      },
    },
  };
};

// Obtener una configuración específica
export const getSettingsByCategory = (category) => {
  if (!currentSettings[category]) {
    throw new Error(`Categoría de configuración no encontrada: ${category}`);
  }

  const setting = currentSettings[category];

  // Ocultar datos sensibles
  if (category === 'email') {
    return {
      ...setting,
      auth: {
        user: setting.auth.user ? '***' : '',
        pass: setting.auth.pass ? '***' : '',
      },
    };
  }

  if (category === 'integrations') {
    return {
      sentry: {
        ...setting.sentry,
        dsn: setting.sentry.dsn ? '***' : '',
      },
      slack: {
        ...setting.slack,
        webhook: setting.slack.webhook ? '***' : '',
      },
    };
  }

  return setting;
};

// Actualizar configuraciones
export const updateSettings = (category, data, userId) => {
  if (!currentSettings[category]) {
    throw new Error(`Categoría de configuración no encontrada: ${category}`);
  }

  const oldSettings = JSON.stringify(currentSettings[category]);

  currentSettings[category] = {
    ...currentSettings[category],
    ...data,
  };

  saveSettings(currentSettings);

  // Auditar cambio
  logAction({
    userId,
    action: 'UPDATE',
    resource: 'SETTINGS',
    resourceId: category,
    details: {
      category,
      oldValue: oldSettings,
      newValue: JSON.stringify(currentSettings[category]),
    },
    status: 'SUCCESS',
  });

  return getSettingsByCategory(category);
};

// Actualizar configuración de email
export const updateEmailSettings = (emailConfig, userId) => {
  const { host, port, secure, user, pass, from, enabled } = emailConfig;

  const newEmailConfig = {
    enabled,
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    from,
  };

  return updateSettings('email', newEmailConfig, userId);
};

// Probar conexión de email
export const testEmailConnection = async (emailConfig) => {
  try {
    const { host, port, secure, auth, from } = emailConfig || currentSettings.email;

    if (!auth.user || !auth.pass) {
      throw new Error('Credenciales de email incompletas');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
    });

    await transporter.verify();

    return {
      success: true,
      message: 'Conexión de email exitosa',
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Enviar email de prueba
export const sendTestEmail = async (toEmail, emailConfig) => {
  try {
    const { host, port, secure, auth, from } = emailConfig || currentSettings.email;

    if (!auth.user || !auth.pass) {
      throw new Error('Credenciales de email incompletas');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
    });

    const mailOptions = {
      from,
      to: toEmail,
      subject: 'Email de prueba - Abox Platform',
      html: `
        <h1>Email de prueba</h1>
        <p>Este es un email de prueba de la configuración de email en Abox Platform.</p>
        <p>Si lo recibiste, significa que tu configuración está correcta.</p>
        <hr>
        <p><small>Enviado desde Abox Platform</small></p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: `Email de prueba enviado a ${toEmail}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Obtener configuración pública (sin datos sensibles)
export const getPublicSettings = () => {
  return {
    platform: currentSettings.platform,
    maintenance: currentSettings.maintenance,
  };
};

// Hacer backup de configuraciones
export const backupSettings = () => {
  try {
    ensureConfigDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(configDir, `settings-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(currentSettings, null, 2), 'utf-8');
    return {
      success: true,
      message: `Backup creado: settings-backup-${timestamp}.json`,
      file: backupFile,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Restaurar configuraciones desde backup
export const restoreSettings = (backupFileName, userId) => {
  try {
    ensureConfigDirectory();
    const backupFile = path.join(configDir, backupFileName);

    if (!fs.existsSync(backupFile)) {
      throw new Error('Archivo de backup no encontrado');
    }

    const data = fs.readFileSync(backupFile, 'utf-8');
    const backupSettings = JSON.parse(data);

    currentSettings = backupSettings;
    saveSettings(currentSettings);

    logAction({
      userId,
      action: 'UPDATE',
      resource: 'SETTINGS',
      resourceId: 'RESTORE',
      details: {
        backupFile: backupFileName,
      },
      status: 'SUCCESS',
    });

    return {
      success: true,
      message: `Configuraciones restauradas desde ${backupFileName}`,
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
    };
  }
};

// Listar backups disponibles
export const listBackups = () => {
  try {
    ensureConfigDirectory();
    const files = fs.readdirSync(configDir);
    const backups = files
      .filter((f) => f.startsWith('settings-backup-') && f.endsWith('.json'))
      .map((f) => ({
        name: f,
        created: f.replace('settings-backup-', '').replace('.json', ''),
      }))
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    return backups;
  } catch (error) {
    return [];
  }
};

// Resetear a valores por defecto
export const resetToDefaults = (userId) => {
  currentSettings = JSON.parse(JSON.stringify(defaultSettings));
  saveSettings(currentSettings);

  logAction({
    userId,
    action: 'UPDATE',
    resource: 'SETTINGS',
    resourceId: 'RESET',
    details: {
      action: 'Reset to defaults',
    },
    status: 'SUCCESS',
  });

  return {
    success: true,
    message: 'Configuraciones reseteadas a valores por defecto',
  };
};
