import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';
import * as ordersController from './orders.controller.js';
import {
    createOrderValidator,
    updateOrderStatusValidator,
    addOrderPaymentValidator,
    listOrdersValidator,
    updateOrderValidator
} from './orders.validator.js';

const router = Router();

router.use(authMiddleware('COMPANY'));
router.use(requireRole(['OWNER', 'ADMIN', 'MANAGER']));

// GET /companies/:companyId/orders - Listar órdenes
router.get(
    '/companies/:companyId/orders',
    listOrdersValidator,
    validateFields,
    auditMiddleware('READ', 'ORDER'),
    ordersController.getOrders
);

// POST /companies/:companyId/orders - Crear orden
router.post(
    '/companies/:companyId/orders',
    createOrderValidator,
    validateFields,
    auditMiddleware('CREATE', 'ORDER'),
    ordersController.createOrder
);

// GET /companies/:companyId/orders/:id - Obtener orden
router.get(
    '/companies/:companyId/orders/:id',
    auditMiddleware('READ', 'ORDER'),
    ordersController.getOrderById
);

// PUT /companies/:companyId/orders/:id/status - Actualizar estado
router.put(
    '/companies/:companyId/orders/:id/status',
    updateOrderStatusValidator,
    validateFields,
    auditMiddleware('UPDATE', 'ORDER'),
    ordersController.updateOrderStatus
);

// POST /companies/:companyId/orders/:id/payments - Agregar pago
router.post(
    '/companies/:companyId/orders/:id/payments',
    addOrderPaymentValidator,
    validateFields,
    auditMiddleware('CREATE', 'ORDER_PAYMENT'),
    ordersController.addOrderPayment
);

// PUT /companies/:companyId/orders/:id/details - Actualizar detalles (notas/precios)
router.put(
    '/companies/:companyId/orders/:id',
    updateOrderValidator,
    validateFields,
    auditMiddleware('UPDATE', 'ORDER'),
    ordersController.updateOrder
);
export default router;

