import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';
import * as salesController from './sales.controller.js';
import {
    createSaleValidator,
    listSalesValidator,
    cancelSaleValidator
} from './sales.validator.js';

const router = Router();

// Todas las rutas requieren autenticación y pertenecer a la empresa
router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER', 'SELLER'])); // Agregué SELLER si tu sistema lo usa

// GET /companies/:companyId/sales - Listar ventas con filtros
router.get(
    '/companies/:companyId/sales',
    listSalesValidator,
    validateFields,
    //auditMiddleware('READ', 'SALE'),
    salesController.getSales
);

// POST /companies/:companyId/sales - Crear nueva venta
router.post(
    '/companies/:companyId/sales',
    createSaleValidator,
    validateFields,
    //auditMiddleware('CREATE', 'SALE'),
    salesController.createSale
);

// GET /companies/:companyId/sales/:id - Ver detalle de venta
router.get(
    '/companies/:companyId/sales/:id',
    //auditMiddleware('READ', 'SALE'),
    salesController.getSaleById
);

// PUT /companies/:companyId/sales/:id/cancel - Anular venta
// Usamos PUT porque es un cambio de estado lógico, no un DELETE físico
router.put(
    '/companies/:companyId/sales/:id/cancel',
    cancelSaleValidator,
    validateFields,
    //auditMiddleware('UPDATE', 'SALE_CANCEL'), // Acción específica para auditoría
    salesController.cancelSale
);

export default router;