import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.join(__dirname, '../../../logs');
const auditLogFile = path.join(logsDir, 'audit.jsonl');

// Asegurar que el directorio de logs exista
const ensureLogsDirectory = () => {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
};

// Estructura de logs en memoria para acceso rápido (últimos N logs)
const auditLogs = [];
const MAX_IN_MEMORY_LOGS = 1000;

// Cargar logs existentes al iniciar
const loadAuditLogs = () => {
  try {
    ensureLogsDirectory();
    if (fs.existsSync(auditLogFile)) {
      const content = fs.readFileSync(auditLogFile, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim());
      const logs = lines.map((line) => JSON.parse(line));
      // Mantener solo los últimos MAX_IN_MEMORY_LOGS
      auditLogs.push(...logs.slice(-MAX_IN_MEMORY_LOGS));
    }
  } catch (error) {
    console.error('Error al cargar audit logs:', error);
  }
};

// Guardar log en archivo
const saveLogToFile = (logEntry) => {
  try {
    ensureLogsDirectory();
    fs.appendFileSync(auditLogFile, JSON.stringify(logEntry) + '\n', 'utf-8');
  } catch (error) {
    console.error('Error al guardar audit log:', error);
  }
};

// Registrar una acción
export const logAction = (data) => {
  const {
    userId,
    action,
    resource,
    resourceId,
    details = {},
    ipAddress = 'unknown',
    userAgent = 'unknown',
    status = 'SUCCESS',
  } = data;

  const logEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId,
    action,
    resource,
    resourceId,
    details,
    ipAddress,
    userAgent,
    status,
    timestamp: new Date().toISOString(),
    createdAt: new Date(),
  };

  // Agregar a logs en memoria
  auditLogs.push(logEntry);
  if (auditLogs.length > MAX_IN_MEMORY_LOGS) {
    auditLogs.shift();
  }

  // Guardar en archivo
  saveLogToFile(logEntry);

  return logEntry;
};

// Obtener todos los logs con filtros
export const getAuditLogs = (
  page = 1,
  limit = 10,
  filters = {}
) => {
  const { action, resource, userId, startDate, endDate } = filters;

  let filtered = [...auditLogs];

  // Aplicar filtros
  if (action) {
    filtered = filtered.filter((log) => log.action === action);
  }
  if (resource) {
    filtered = filtered.filter((log) => log.resource === resource);
  }
  if (userId) {
    filtered = filtered.filter((log) => log.userId === userId);
  }
  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter((log) => new Date(log.createdAt) >= start);
  }
  if (endDate) {
    const end = new Date(endDate);
    filtered = filtered.filter((log) => new Date(log.createdAt) <= end);
  }

  // Ordenar por fecha descendente
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Paginación
  const skip = (page - 1) * limit;
  const paginatedLogs = filtered.slice(skip, skip + limit);

  return {
    data: paginatedLogs,
    pagination: {
      page,
      limit,
      total: filtered.length,
      pages: Math.ceil(filtered.length / limit),
    },
  };
};

// Obtener un log específico
export const getAuditLogById = (id) => {
  return auditLogs.find((log) => log.id === id) || null;
};

// Obtener estadísticas de auditoría
export const getAuditStats = () => {
  const stats = {
    totalLogs: auditLogs.length,
    actionCount: {},
    resourceCount: {},
    userCount: {},
    statusCount: {},
    last24Hours: 0,
    last7Days: 0,
  };

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  auditLogs.forEach((log) => {
    const logDate = new Date(log.createdAt);

    // Contar por acción
    stats.actionCount[log.action] = (stats.actionCount[log.action] || 0) + 1;

    // Contar por recurso
    stats.resourceCount[log.resource] =
      (stats.resourceCount[log.resource] || 0) + 1;

    // Contar por usuario
    stats.userCount[log.userId] = (stats.userCount[log.userId] || 0) + 1;

    // Contar por estado
    stats.statusCount[log.status] = (stats.statusCount[log.status] || 0) + 1;

    // Contar últimas 24 horas
    if (logDate >= oneDayAgo) {
      stats.last24Hours++;
    }

    // Contar últimos 7 días
    if (logDate >= sevenDaysAgo) {
      stats.last7Days++;
    }
  });

  return stats;
};

// Exportar logs a CSV
export const exportAuditLogs = (filters = {}) => {
  const result = getAuditLogs(1, 100000, filters);
  const logs = result.data;

  let csv = 'ID,Usuario,Acción,Recurso,ID Recurso,Estado,Fecha,IP,Detalles\n';

  logs.forEach((log) => {
    const details = JSON.stringify(log.details).replace(/"/g, '""');
    csv += `${log.id},"${log.userId}","${log.action}","${log.resource}","${log.resourceId}","${log.status}","${log.timestamp}","${log.ipAddress}","${details}"\n`;
  });

  return csv;
};

// Inicializar logs al importar el módulo
loadAuditLogs();
