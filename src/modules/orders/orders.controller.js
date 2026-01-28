import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as ordersService from './orders.service.js';

export const createOrder = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { userId } = req.user;
    // Extraemos 'payments'
    const { customerId, items, deliveryZoneId, discount, warehouseId, deliveryFee, notes, payments } = req.body;

    const order = await ordersService.createOrder(companyId, userId, {
        customerId,
        items,
        deliveryZoneId,
        discount,
        warehouseId,
        deliveryFee,
        notes,
        payments // Pasamos el array de pagos iniciales
    });

    res.status(201).json({ success: true, message: 'Orden creada', data: order });
});

export const addOrderPayment = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;
    const { userId } = req.user;
    // Extraemos tanto el array como los campos sueltos
    const { payments, amount, paymentMethod, reference } = req.body;

    const result = await ordersService.addOrderPayment(companyId, id, {
        payments,
        amount, 
        paymentMethod,
        reference
    }, userId);

    res.status(201).json({ success: true, message: 'Pago(s) registrado(s)', data: result });
});

export const getOrders = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { page, limit, status, paymentStatus } = req.query;

    const result = await ordersService.getOrders(companyId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        status,
        paymentStatus,
    });

    res.json({
        success: true,
        ...result,
    });
});

export const getOrderById = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;

    const order = await ordersService.getOrderById(companyId, id);

    res.json({
        success: true,
        data: order,
    });
});

export const updateOrderStatus = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;
    const { status } = req.body;
    const { userId } = req.user;

    const order = await ordersService.updateOrderStatus(companyId, id, status, userId);

    res.json({
        success: true,
        message: 'Estado de orden actualizado exitosamente',
        data: order,
    });
});

export const updateOrder = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;
    const { userId } = req.user;
    const { items, discount, deliveryFee, notes } = req.body;

    const order = await ordersService.updateOrder(companyId, id, userId, {
        items,
        discount,
        deliveryFee,
        notes
    });

    res.json({
        success: true,
        message: 'Orden actualizada y stock sincronizado',
        data: order
    });
});