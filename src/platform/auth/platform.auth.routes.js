import { Router } from 'express';
import { login, refresh, logout } from './platform.auth.controller.js';
import validateFields from '../../middlewares/validateFields.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { platformLoginValidator, platformRefreshValidator } from './platform.auth.validator.js';

const router = Router();

// Login exclusivo de plataforma
router.post(
  '/login',
  platformLoginValidator,
  validateFields,
  login
);

router.post(
  '/refresh',
  platformRefreshValidator,
  validateFields,
  refresh
);

router.post(
  '/logout',
  authMiddleware('PLATFORM'),
  logout
);


export default router;
