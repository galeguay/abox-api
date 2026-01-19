import { Router } from 'express';
import { login } from './platform.auth.controller.js';
import validateFields from '../../middlewares/validateFields.js';
import { platformLoginValidator } from './platform.auth.validator.js';

const router = Router();

// Login exclusivo de plataforma
router.post(
  '/login',
  platformLoginValidator,
  validateFields,
  login
);

export default router;
