import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { emailUniqueOnUpdate } from '../../middlewares/emailUnique.js';

import {
  getMe,
  updateMe,
  changePassword,
  activateUser,
  deactivateUser,
  getUsers,
  getUserById,
  updateUser,
} from './users.controller.js';

import {
  updateMeValidator,
  changePasswordValidator,
  updateUserValidator,
} from './users.validator.js';

const router = Router();
router.use(authMiddleware);
router.get('/me', getMe);

router.put(
  '/me',
  updateMeValidator,
  validateFields,
  emailUniqueOnUpdate({
    getUserId: (req) => req.user.id,
  }),
  updateMe
);

router.put(
  '/me/password',
  changePasswordValidator,
  validateFields,
  changePassword
);

router.get(
  '/',
  requireRole(['OWNER']),
  getUsers
);

router.get(
  '/:id',
  requireRole(['OWNER', 'ADMIN']),
  getUserById
);

router.put(
  '/:id',
  requireRole(['OWNER', 'ADMIN']),
  updateUserValidator,
  validateFields,
  emailUniqueOnUpdate({
    getUserId: (req) => req.params.id,
  }),
  updateUser
);

router.patch(
  '/:id/activate',
  requireRole(['OWNER']),
  activateUser
);

router.patch(
  '/:id/deactivate',
  requireRole(['OWNER']),
  deactivateUser
);

export default router;
