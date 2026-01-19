import * as platformAuthService from './platform.auth.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const login = asyncWrapper(async (req, res) => {
  const result = await platformAuthService.login(req.body);
  res.json({ ok: true, data: result });
});
