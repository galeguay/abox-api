import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as ordersService from './orders.service.js';

export const createOrder = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { userId } = req.user;
const { customerId, items, deliveryZoneId, discount, warehouseId, deliveryFee, notes } = req.body;

  const order = await ordersService.createOrder(companyId, userId, {
    customerId,
    items,
    deliveryZoneId,
    discount,
    warehouseId,
    deliveryFee,
    notes,
  });

  res.status(201).json({
    success: true,
    message: 'Orden creada exitosamente',
    data: order,
  });
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

  const order = await ordersService.updateOrderStatus(companyId, id, status);

  res.json({
    success: true,
    message: 'Estado de orden actualizado exitosamente',
    data: order,
  });
});

export const addOrderItem = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;
  const { productId, quantity, basePrice } = req.body;

  const item = await ordersService.addOrderItem(companyId, id, {
    productId,
    quantity,
    basePrice,
  });

  res.status(201).json({
    success: true,
    message: 'Item agregado a la orden',
    data: item,
  });
});

export const addOrderPayment = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;
  const { amount, paymentMethod, reference } = req.body;

  const payment = await ordersService.addOrderPayment(companyId, id, {
    amount,
    paymentMethod,
    reference,
  });

  res.status(201).json({
    success: true,
    message: 'Pago registrado exitosamente',
    data: payment,
  });
});

export const deleteOrderItem = asyncWrapper(async (req, res) => {
  const { companyId, id, itemId } = req.params;

  const result = await ordersService.deleteOrderItem(companyId, id, itemId);

  res.json({
    success: true,
    message: result.message,
  });
});

export const updateOrderDetails = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;
  // Extraemos solo lo que permitimos editar
  const { deliveryFee, discount, notes } = req.body;

  const order = await ordersService.updateOrderDetails(companyId, id, {
    deliveryFee,
    discount,
    notes
  });

  res.json({
    success: true,
    message: 'Detalles de la orden actualizados',
    data: order,
  });
});