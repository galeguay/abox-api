import * as platformAdminService from './platform.admin.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const createAdmin = asyncWrapper(async (req, res) => {
  const result = await platformAdminService.createAdmin(req.body);
  res.status(201).json({ ok: true, data: result });
});

export const getAdmins = asyncWrapper(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const result = await platformAdminService.getAdmins(
    parseInt(page),
    parseInt(limit)
  );
  res.json({ ok: true, data: result });
});

export const getAdmin = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const result = await platformAdminService.getAdminById(id);
  res.json({ ok: true, data: result });
});

export const updateAdmin = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const result = await platformAdminService.updateAdmin(id, req.body);
  res.json({ ok: true, data: result });
});

export const deleteAdmin = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const result = await platformAdminService.deleteAdmin(id);
  res.status(204).json({ ok: true, data: result });
});
