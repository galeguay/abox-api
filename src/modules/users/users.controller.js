import userService from './users.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const createAndAssignUser = asyncWrapper(async (req, res) => {
  const result = await userService.createAndAssignUser(req.body, req.companyId);
  res.status(201).json({ ok: true, data: result });
});

export const getCompanyUsers = asyncWrapper(async (req, res) => {
  const members = await userService.getCompanyMembers(req.companyId);
  res.json({ ok: true, data: members });
});

export const updateRole = asyncWrapper(async (req, res) => {
  const { userId, role } = req.body;
  const result = await userService.updateMemberRole(req.companyId, userId, role);
  res.json({ ok: true, data: result });
});

export const deleteMember = asyncWrapper(async (req, res) => {
  const { userId } = req.params;
  await userService.removeMember(req.companyId, userId);
  res.json({ ok: true, message: 'Usuario removido con éxito' });
});