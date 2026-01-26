import * as platformAuthService from './platform.auth.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const login = asyncWrapper(async (req, res) => {
  const result = await platformAuthService.login(req.body);
  res.json({ ok: true, data: result });
});

export const refresh = asyncWrapper(async (req, res) => {
  const { refreshToken } = req.body;

  const accessToken = await platformAuthService.refresh(refreshToken);

  res.status(200).json({ accessToken });
});

export const logout = asyncWrapper(async (req, res) => {
  await platformAuthService.logout(req.user.sub);
  res.status(200).json({ ok: true, message: 'Logout ok' });
});
