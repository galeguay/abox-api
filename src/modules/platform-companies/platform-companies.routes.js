import { Router } from 'express';
import {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  getCompanyUsers,
  assignUserToCompany,
  updateUserCompanyRole,
  removeUserFromCompany,
} from './platform-companies.controller.js';
import validateFields from '../../middlewares/validateFields.js';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';
import {
  createCompanyValidator,
  updateCompanyValidator,
  listCompaniesValidator,
  assignUserToCompanyValidator,
} from './platform-companies.validator.js';
import { body } from 'express-validator';

const router = Router();

// Middleware para proteger todas las rutas
router.use(authMiddleware('PLATFORM'));
router.use(requireRole('ADMIN'));

// Listar todas las compañías
router.get(
    '/', 
    listCompaniesValidator, 
    validateFields, 
    //auditMiddleware('READ', 'COMPANY'), 
    getCompanies
);

// Crear una nueva compañía
router.post('/', 
    createCompanyValidator, 
    validateFields, 
    //auditMiddleware('CREATE', 'COMPANY', (req, data) => data.data?.id), 
    createCompany
);

// Obtener una compañía específica
router.get(
    '/:id', 
    //auditMiddleware('READ', 'COMPANY'), 
    getCompany
);

// Actualizar una compañía
router.put(
    '/:id', 
    updateCompanyValidator, 
    validateFields, 
    //auditMiddleware('UPDATE', 'COMPANY'), 
    updateCompany
);

// Obtener usuarios de una compañía
router.get(
    '/:id/users', 
    //auditMiddleware('READ', 'COMPANY_USER'), 
    getCompanyUsers
);

// Asignar usuario a una compañía
router.post(
  '/:id/users',
  assignUserToCompanyValidator,
  validateFields,
  //auditMiddleware('CREATE', 'COMPANY_USER', (req, data) => data.data?.user?.id),
  assignUserToCompany
);

// Actualizar rol de usuario en compañía
router.put(
  '/:id/users/:userId',
  body('role')
    .notEmpty()
    .isIn(['ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'])
    .withMessage('role debe ser uno de: ADMIN, MANAGER, EMPLOYEE, VIEWER'),
  validateFields,
  //auditMiddleware('UPDATE', 'COMPANY_USER'),
  updateUserCompanyRole
);

// Remover usuario de una compañía
router.delete(
    '/:id/users/:userId', 
    //auditMiddleware('DELETE', 'COMPANY_USER'), 
    removeUserFromCompany
);

export default router;
