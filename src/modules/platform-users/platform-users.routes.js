import { Router } from 'express';
import validateFields from '../../middlewares/validateFields.js';
import { getUsersValidator, createUserValidator } from './platform-users.validator.js';
import { getUsers, createUser } from './platform-users.controller.js';
import { authMiddleware } from '../../middlewares/auth.js';


const router = Router();

router.use(authMiddleware('PLATFORM'));

//Obtener todos los ususarios
router.get(
    '/',
    getUsersValidator,
    validateFields,
    getUsers
);

//Obtener todos los ususarios
router.post(
    '/',
    createUserValidator,
    validateFields,
//    //auditMiddleware(AUDIT_ACTIONS.CREATE, AUDIT_RESOURCES.USER_PROFILE),
    createUser
);

export default router;