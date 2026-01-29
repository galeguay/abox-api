import * as userService from './users.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

// ==================== MI PERFIL ====================

export const getMe = asyncWrapper(async (req, res) => {
  const user = await userService.getMyProfile(req.user.sub);
  res.json({ ok: true, data: user });
});

export const updateMe = asyncWrapper(async (req, res) => {
  const updated = await userService.updateMyProfile(req.user.sub, req.body);
  res.json({ ok: true, data: updated });
});

export const changePassword = asyncWrapper(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await userService.changeMyPassword(
    req.user.sub,
    currentPassword,
    newPassword
  );
  res.json({ ok: true, data: result });
});

export const getMyCompanies = asyncWrapper(async (req, res) => {
  const companies = await userService.getMyCompanies(req.user.sub);
  res.json({ ok: true, data: companies });
});

export const switchActiveCompany = asyncWrapper(async (req, res) => {
  const { companyId } = req.body;
  const result = await userService.switchActiveCompany(req.user.sub, companyId);
  res.json({ ok: true, data: result });
});

export const getMyPermissions = asyncWrapper(async (req, res) => {
  const permissions = await userService.getMyPermissions(req.user.sub);
  res.json({ ok: true, data: permissions });
});

// ==================== GESTIÓN DE USUARIOS EN EMPRESA ====================

export const getCompanyUsers = asyncWrapper(async (req, res) => {
  const { page = 1, limit = 10, role } = req.query;
  const { companyId } = req.params;
  const result = await userService.getCompanyUsers(
    companyId,
    parseInt(page),
    parseInt(limit),
    { role }
  );
  res.json({ ok: true, data: result });
});

export const getCompanyUserById = asyncWrapper(async (req, res) => {
  const { companyId, userId } = req.params;
  const user = await userService.getCompanyUserById(companyId, userId);
  res.json({ ok: true, data: user });
});

export const inviteUserToCompany = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { email, role } = req.body;
  const result = await userService.inviteUserToCompany(
    companyId,
    email,
    role,
    req.user.sub
  );
  res.status(201).json({ ok: true, data: result });
});

export const changeUserRole = asyncWrapper(async (req, res) => {
  const { companyId, userId } = req.params;
  const { role } = req.body;
  const updated = await userService.changeUserRole(
    companyId,
    userId,
    role,
    req.user.sub
  );
  res.json({ ok: true, data: updated });
});

export const deactivateUserInCompany = asyncWrapper(async (req, res) => {
  const { companyId, userId } = req.params;
  const result = await userService.deactivateUserInCompany(
    companyId,
    userId,
    req.user.sub
  );
  res.json({ ok: true, data: result });
});

export const removeUserFromCompany = asyncWrapper(async (req, res) => {
  const { companyId, userId } = req.params;
  const result = await userService.removeUserFromCompany(
    companyId,
    userId,
    req.user.sub
  );
  res.status(204).json({ ok: true, data: result });
});

// ==================== ROLES Y PERMISOS ====================

export const getAvailableRoles = asyncWrapper(async (req, res) => {
  const roles = userService.getAvailableRoles();
  res.json({ ok: true, data: roles });
});

export const getRolePermissions = asyncWrapper(async (req, res) => {
  const { role } = req.params;
  const permissions = userService.getRolePermissions(role);
  if (!permissions) {
    return res.status(404).json({ ok: false, message: 'Rol no encontrado' });
  }
  res.json({ ok: true, data: permissions });
});

// ==================== MÉTODOS HEREDADOS ====================

export const getUsers = asyncWrapper(async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  
  const result = await userService.default.getAll(
      parseInt(page), 
      parseInt(limit), 
      search
  );
  
  res.json({ ok: true, ...result });
});

export const getUserById = asyncWrapper(async (req, res) => {
  const user = await userService.default.getById(req.params.id);
  res.json({ ok: true, data: user });
});

export const updateUser = asyncWrapper(async (req, res) => {
  const user = await userService.default.updateUser(req.params.id, req.body);
  res.json({ ok: true, data: user });
});

export const activateUser = asyncWrapper(async (req, res) => {
  await userService.default.setActive(req.params.id, true);
  res.json({ ok: true, message: 'Usuario activado' });
});

export const deactivateUser = asyncWrapper(async (req, res) => {
  await userService.default.setActive(req.params.id, false);
  res.json({ ok: true, message: 'Usuario desactivado' });
});

export const setupPassword = asyncWrapper(async (req, res) => {
  const { token, newPassword } = req.body;
  const result = await userService.completeInvitation(token, newPassword);
  res.json({ ok: true, data: result });
});