import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.js';
import requireRole from '../../middlewares/requireRole.js';
import validateFields from '../../middlewares/validateFields.js';
import { auditMiddleware } from '../../middlewares/auditMiddleware.js';
import { updateOrderDetailsValidator } from './orders.validator.js';
import * as ordersController from './orders.controller.js';
import {
    createOrderValidator,
    updateOrderStatusValidator,
    addOrderItemValidator,
    addOrderPaymentValidator,
    listOrdersValidator,
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

// POST /companies/:companyId/orders/:id/items - Agregar item a orden
router.post(
    '/companies/:companyId/orders/:id/items',
    addOrderItemValidator,
    validateFields,
    auditMiddleware('CREATE', 'ORDER_ITEM'),
    ordersController.addOrderItem
);

// DELETE /companies/:companyId/orders/:id/items/:itemId - Eliminar item
router.delete(
    '/companies/:companyId/orders/:id/items/:itemId',
    auditMiddleware('DELETE', 'ORDER_ITEM'),
    ordersController.deleteOrderItem
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
    '/companies/:companyId/orders/:id/details',
    updateOrderDetailsValidator,
    validateFields,
    auditMiddleware('UPDATE', 'ORDER'),
    ordersController.updateOrderDetails
);

export default router;

