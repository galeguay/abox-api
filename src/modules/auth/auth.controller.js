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