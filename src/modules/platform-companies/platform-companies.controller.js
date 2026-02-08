import * as platformCompaniesService from './platform-companies.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const createCompany = asyncWrapper(async (req, res) => {
  const result = await platformCompaniesService.createCompany(req.body);
  res.status(201).json({ ok: true, data: result });
});

export const getCompanies = asyncWrapper(async (req, res) => {
  const { page = 1, limit = 10, active, search } = req.query;

  const result = await platformCompaniesService.getCompanies(
    parseInt(page),
    parseInt(limit),
    active,
    search // <--- ¡Importante!
  );

  res.json({ ok: true, data: result });
});
export const getCompany = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const result = await platformCompaniesService.getCompanyById(id);
  res.json({ ok: true, data: result });
});

export const updateCompany = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const result = await platformCompaniesService.updateCompany(id, req.body);
  res.json({ ok: true, data: result });
});

export const getCompanyUsers = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const result = await platformCompaniesService.getCompanyUsers(
    id,
    parseInt(page),
    parseInt(limit)
  );
  res.json({ ok: true, data: result });
});

export const assignUserToCompany = asyncWrapper(async (req, res) => {
  const { id } = req.params;
  const result = await platformCompaniesService.assignUserToCompany(id, req.body);
  res.status(201).json({ ok: true, data: result });
});

export const updateUserCompanyRole = asyncWrapper(async (req, res) => {
  const { id, userId } = req.params;
  const { role } = req.body;
  const result = await platformCompaniesService.updateUserCompanyRole(id, userId, role);
  res.json({ ok: true, data: result });
});

export const removeUserFromCompany = asyncWrapper(async (req, res) => {
  const { id, userId } = req.params;
  const result = await platformCompaniesService.removeUserFromCompany(id, userId);
  res.status(204).json({ ok: true, data: result });
});
