import * as platformAuditService from './platform.audit.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const getAuditLogs = asyncWrapper(async (req, res) => {
  const { page = 1, limit = 10, action, resource, userId, startDate, endDate } = req.query;

  const result = platformAuditService.getAuditLogs(parseInt(page), parseInt(limit), {
    action,
    resource,
    userId,
    startDate,
    endDate,
  });

  res.json({ ok: true, data: result });
});

export const getAuditLog = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const log = platformAuditService.getAuditLogById(id);

  if (!log) {
    return res.status(404).json({ ok: false, message: 'Log no encontrado' });
  }

  res.json({ ok: true, data: log });
});

export const getAuditStats = asyncWrapper(async (req, res) => {
  const stats = platformAuditService.getAuditStats();
  res.json({ ok: true, data: stats });
});

export const exportAuditLogs = asyncWrapper(async (req, res) => {
  const { action, resource, userId, startDate, endDate } = req.query;

  const csv = platformAuditService.exportAuditLogs({
    action,
    resource,
    userId,
    startDate,
    endDate,
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
  res.send(csv);
});
