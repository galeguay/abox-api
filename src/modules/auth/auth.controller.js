import * as authService from './auth.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const login = asyncWrapper(async (req, res) => {
  const result = await authService.login(req.body); 
  res.json({ ok: true, data: result });
});

export const register = asyncWrapper(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ ok: true, data: result });
});

export const refreshToken = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.json({ ok: true, data: { accessToken: result } });
});

export const logout = asyncWrapper(async (req, res) => {
  await authService.logout(req.user.sub);
  res.json({ ok: true, message: 'Sesión cerrada correctamente' });
});

export const forgotPassword = asyncWrapper(async (req, res) => {
  const result = await authService.forgotPassword(req.body);
  res.json({ ok: true, message: 'Se envió un enlace de recuperación al correo' });
});

export const resetPassword = asyncWrapper(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
});