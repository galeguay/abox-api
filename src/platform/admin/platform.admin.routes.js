import { Router } from 'express';
import {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  deleteAdmin,
} from './platform.admin.controller.js';
import validateFields from '../../middlewares/validateFields.js';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';
import {
  createAdminValidator,
  updateAdminValidator,
  listAdminsValidator,
} from './platform.admin.validator.js';

const router = Router();

// Middleware para proteger todas las rutas
router.use(authMiddleware('PLATFORM'));
router.use(requireRole('ADMIN'));

// GET /platform/admin - Listar todos los admins
router.get(
    '/', 
    listAdminsValidator, 
    validateFields, 
    //auditMiddleware('READ', 'ADMIN'), 
    getAdmins
);

// POST /platform/admin - Crear un nuevo admin
router.post(
    '/', 
    createAdminValidator, 
    validateFields, 
    //auditMiddleware('CREATE', 'ADMIN', (req, data) => data.data?.id),
    createAdmin
);

// GET /platform/admin/:id - Obtener un admin específico
router.get(
    '/:id', 
    //auditMiddleware('READ', 'ADMIN'), 
    getAdmin
);

// PUT /platform/admin/:id - Actualizar un admin
router.put(
    '/:id', 
    updateAdminValidator, 
    validateFields, 
    //auditMiddleware('UPDATE', 'ADMIN'), 
    updateAdmin
);

// DELETE /platform/admin/:id - Eliminar un admin
router.delete(
    '/:id', 
    //auditMiddleware('DELETE', 'ADMIN'),
    deleteAdmin
);

export default router;
