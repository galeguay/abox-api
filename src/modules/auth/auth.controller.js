import * as authService from './auth.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const login = asyncWrapper(async (req, res) => {
    const result = await authService.login(req.body);

    authService.cleanExpiredTokens().catch(err => console.error("Error limpiando tokens:", err));

    res.json({ ok: true, data: result });
});

export const selectCompanyController = asyncWrapper(async (req, res) => {
    const result = await authService.selectCompany(req.body);
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
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json({ ok: true, message: 'Sesión cerrada correctamente' });
});

export const logoutAll = asyncWrapper(async (req, res) => {
    // req.user.id viene cargado por el authMiddleware
    await authService.logoutAllDevices(req.user.id);
    res.json({ ok: true, message: 'Se han cerrado todas las sesiones activas' });
});

export const forgotPassword = asyncWrapper(async (req, res) => {
    const result = await authService.forgotPassword(req.body);
    res.json({ ok: true, message: 'Se envió un enlace de recuperación al correo' });
});

export const resetPassword = asyncWrapper(async (req, res) => {
    const result = await authService.resetPassword(req.body);
    res.json({ ok: true, message: 'Contraseña actualizada correctamente' });
});