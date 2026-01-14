import { Router } from 'express';
import { login, register } from './auth.controller.js';
import { createUserValidator } from '../users/users.validator.js';
import validateFields from '../../middlewares/validateFields.js';

const router = Router();

// Registro público de usuario
router.post('/register', createUserValidator, validateFields, register);

router.post('/login', login);

export default router;

