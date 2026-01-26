import * as platformSettingsService from './platform.settings.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const getSettings = asyncWrapper(async (req, res) => {
  const settings = platformSettingsService.getSettings();
  res.json({ ok: true, data: settings });
});

export const getSettingsByCategory = asyncWrapper(async (req, res) => {
  const { category } = req.params;
  try {
    const settings = platformSettingsService.getSettingsByCategory(category);
    res.json({ ok: true, data: settings });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

export const updateSettings = asyncWrapper(async (req, res) => {
  const { category } = req.params;
  try {
    const updated = platformSettingsService.updateSettings(
      category,
      req.body,
      req.user.sub
    );
    res.json({ ok: true, data: updated });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

export const updateEmailSettings = asyncWrapper(async (req, res) => {
  try {
    const updated = platformSettingsService.updateEmailSettings(
      req.body,
      req.user.sub
    );
    res.json({ ok: true, data: updated });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

export const testEmailConnection = asyncWrapper(async (req, res) => {
  const result = await platformSettingsService.testEmailConnection(req.body);
  res.json({ ok: result.success, data: result });
});

export const sendTestEmail = asyncWrapper(async (req, res) => {
  const { toEmail } = req.body;
  const result = await platformSettingsService.sendTestEmail(toEmail, req.body);
  res.json({ ok: result.success, data: result });
});

export const getPublicSettings = asyncWrapper(async (req, res) => {
  const settings = platformSettingsService.getPublicSettings();
  res.json({ ok: true, data: settings });
});

export const backupSettings = asyncWrapper(async (req, res) => {
  const result = platformSettingsService.backupSettings();
  res.json({ ok: result.success, data: result });
});

export const listBackups = asyncWrapper(async (req, res) => {
  const backups = platformSettingsService.listBackups();
  res.json({ ok: true, data: backups });
});

export const restoreSettings = asyncWrapper(async (req, res) => {
  const { backupFileName } = req.body;
  try {
    const result = platformSettingsService.restoreSettings(
      backupFileName,
      req.user.sub
    );
    res.json({ ok: result.success, data: result });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

export const resetToDefaults = asyncWrapper(async (req, res) => {
  const result = platformSettingsService.resetToDefaults(req.user.sub);
  res.json({ ok: result.success, data: result });
});
