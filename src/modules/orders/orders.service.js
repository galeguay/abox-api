import { 
    Prisma, 
    OrderStatus, 
    PaymentStatus, 
    PaymentMethod,
    MovementType,
    MoneyReferenceType,
    StockReferenceType
} from '@prisma/client';
import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';
import * as stockService from '../stock/stock.service.js';
import * as salesService from '../sales/sales.service.js';

// ==========================================
// 1. CREACIÓN DE ORDEN (Con Precisión y Pagos Iniciales)
// ==========================================

export const createOrder = async (companyId, userId, data) => {
    const { 
        customerId, items, deliveryZoneId, warehouseId, 
        discount = 0, deliveryFee = 0, notes,
        payments = [] // Array de pagos iniciales (seña)
    } = data;

    // 1. Validaciones básicas
    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId, active: true }
    });
    if (!warehouse) throw new AppError('Almacén no válido', 404);

    // 2. Obtener productos y calcular stock
    const itemsWithData = [];
    let subtotal = new Prisma.Decimal(0);

    // Optimizamos query de productos
    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
        include: {
            costs: { orderBy: { createdAt: 'desc' }, take: 1 },
            stocks: { where: { warehouseId } }
        }
    });

    for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) throw new AppError(`Producto no encontrado: ${item.productId}`, 404);

        const currentStock = new Prisma.Decimal(product.stocks[0]?.quantity || 0);
        const reqQty = new Prisma.Decimal(item.quantity);

        if (currentStock.lt(reqQty)) {
            throw new AppError(`Stock insuficiente para: ${product.name}. Disponible: ${currentStock}`, 409);
        }

        // Precio: Prioridad al del item, sino al del producto
        const basePrice = item.basePrice !== undefined 
            ? new Prisma.Decimal(item.basePrice) 
            : new Prisma.Decimal(product.price);
        
        const lineTotal = basePrice.mul(reqQty);
        subtotal = subtotal.add(lineTotal);

        itemsWithData.push({
            productId: item.productId,
            quantity: reqQty,
            basePrice: basePrice,
            price: lineTotal,
            cost: new Prisma.Decimal(product.costs[0]?.cost || 0)
        });
    }

    // 3. Totales
    const decDiscount = new Prisma.Decimal(discount);
    const decDelivery = new Prisma.Decimal(deliveryFee);
    
    // Total = (Subtotal - Descuento) + Delivery
    // Aseguramos que subtotal - descuento no sea negativo antes de sumar delivery
    let taxableBase = subtotal.sub(decDiscount);
    if (taxableBase.isNegative()) taxableBase = new Prisma.Decimal(0);
    
    const total = taxableBase.add(decDelivery);

    // 4. Procesar Pagos Iniciales (Seña)
    let initialPaid = new Prisma.Decimal(0);
    const preparedPayments = [];

    if (payments && Array.isArray(payments)) {
        for (const p of payments) {
            const amt = new Prisma.Decimal(p.amount);
            initialPaid = initialPaid.add(amt);
            preparedPayments.push({ ...p, amount: amt });
        }
    }

    // Validar exceso de pago
    if (initialPaid.gt(total)) throw new AppError('El pago inicial excede el total', 400);

    let paymentStatus = PaymentStatus.OPEN;
    if (initialPaid.gte(total)) paymentStatus = PaymentStatus.PAID;
    else if (initialPaid.gt(0)) paymentStatus = PaymentStatus.PENDING;

    // 5. Transacción
    return await prisma.$transaction(async (tx) => {
        // A. Crear Orden
        const order = await tx.order.create({
            data: {
                companyId,
                createdById: userId,
                warehouseId,
                customerId: customerId || null,
                deliveryZoneId: deliveryZoneId || null,
                status: OrderStatus.PENDING,
                paymentStatus,
                subtotal,
                discount: decDiscount,
                deliveryFee: decDelivery,
                total,
                notes,
                items: {
                    create: itemsWithData.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        basePrice: i.basePrice,
                        price: i.price,
                        cost: i.cost
                    }))
                }
            }
        });

        // B. Registrar Pagos y Caja
        for (const p of preparedPayments) {
            await tx.orderPayment.create({
                data: {
                    orderId: order.id,
                    amount: p.amount,
                    paymentMethod: p.paymentMethod,
                    reference: p.reference
                }
            });

            await tx.moneyMovement.create({
                data: {
                    companyId,
                    type: MovementType.IN,
                    amount: p.amount,
                    paymentMethod: p.paymentMethod,
                    referenceType: MoneyReferenceType.ORDER,
                    referenceId: order.id,
                    description: `Orden #${order.id.slice(0, 8)} (Seña)`,
                    createdById: userId
                }
            });
        }

        // C. Reservar Stock
        await stockService.registerStockExit(
            companyId,
            warehouseId,
            itemsWithData.map(i => ({ productId: i.productId, quantity: i.quantity })),
            order.id,
            userId,
            tx,
            StockReferenceType.ORDER_RESERVATION
        );

        return order;
    });
};

// ==========================================
// 2. AGREGAR PAGOS (Soporte Mixto)
// ==========================================

export const addOrderPayment = async (companyId, orderId, data, userId) => {
    // Normalizar input: puede venir array 'payments' o campos sueltos
    let incomingPayments = [];
    if (data.payments && Array.isArray(data.payments)) {
        incomingPayments = data.payments;
    } else if (data.amount && data.paymentMethod) {
        incomingPayments = [{ ...data }];
    }

    if (incomingPayments.length === 0) throw new AppError('No se indicaron pagos', 400);

    return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({
            where: { id: orderId, companyId },
            include: { payments: true }
        });

        if (!order) throw new AppError('Orden no encontrada', 404);
        if (order.status === OrderStatus.CANCELED) throw new AppError('Orden cancelada', 400);

        // Calcular pagado hasta ahora
        const previouslyPaid = order.payments.reduce((acc, p) => acc.add(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0));
        const orderTotal = new Prisma.Decimal(order.total);
        
        let newPaymentsTotal = new Prisma.Decimal(0);
        const paymentsToInsert = [];

        for (const p of incomingPayments) {
            const amt = new Prisma.Decimal(p.amount);
            newPaymentsTotal = newPaymentsTotal.add(amt);
            paymentsToInsert.push({
                amount: amt,
                paymentMethod: p.paymentMethod,
                reference: p.reference
            });
        }

        const totalAfterPay = previouslyPaid.add(newPaymentsTotal);

        if (totalAfterPay.gt(orderTotal)) {
            throw new AppError(`El monto excede el total pendiente (${orderTotal.sub(previouslyPaid)})`, 400);
        }

        const createdPayments = [];
        for (const p of paymentsToInsert) {
            const pay = await tx.orderPayment.create({
                data: {
                    orderId,
                    amount: p.amount,
                    paymentMethod: p.paymentMethod,
                    reference: p.reference
                }
            });
            createdPayments.push(pay);

            await tx.moneyMovement.create({
                data: {
                    companyId,
                    type: MovementType.IN,
                    amount: p.amount,
                    paymentMethod: p.paymentMethod,
                    referenceType: MoneyReferenceType.ORDER,
                    referenceId: orderId,
                    description: `Cobro Orden #${order.id.slice(0, 8)}`,
                    createdById: userId
                }
            });
        }

        // Actualizar Estado
        let newStatus = PaymentStatus.PENDING;
        if (totalAfterPay.gte(orderTotal)) newStatus = PaymentStatus.PAID;

        await tx.order.update({
            where: { id: orderId },
            data: { paymentStatus: newStatus }
        });

        // AUTO-GENERAR VENTA si la orden ya fue entregada y ahora se completa el pago
        if (newStatus === PaymentStatus.PAID && order.status === OrderStatus.DELIVERED) {
            const existingSale = await tx.sale.findFirst({ where: { orderId } });
            if (!existingSale) {
                await salesService.createSaleFromOrder(orderId, tx);
            }
        }

        return createdPayments;
    });
};

// ==========================================
// 3. ACTUALIZACIÓN DE ORDEN (Con Decimal)
// ==========================================

// ==========================================
// 3. ACTUALIZACIÓN DE ORDEN (Completo)
// ==========================================

export const updateOrder = async (companyId, orderId, userId, data) => {
    const { items, discount, deliveryFee, notes } = data;

    return await prisma.$transaction(async (tx) => {
        // 1. Obtener la orden actual con sus items
        const oldOrder = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        });

        if (!oldOrder || oldOrder.companyId !== companyId) {
            throw new AppError('Orden no encontrada', 404);
        }

        // Solo permitimos editar si está PENDING (ni confirmada, ni enviada)
        if (oldOrder.status !== OrderStatus.PENDING) {
            throw new AppError('Solo se pueden editar órdenes en estado PENDING', 400);
        }

        // 2. DEVOLVER STOCK PREVIO (Revertir reserva anterior)
        // Esto "libera" el stock para que pueda ser usado en el recálculo
        const oldStockItems = oldOrder.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity // Prisma lo maneja, pero si es Decimal viene como objeto
        }));

        await stockService.registerStockEntry(
            companyId,
            oldOrder.warehouseId,
            oldStockItems,
            oldOrder.id,
            userId,
            tx,
            StockReferenceType.ORDER_RESERVATION
        );

        // 3. PREPARAR NUEVOS ITEMS Y CALCULAR
        // Buscamos los productos nuevos para obtener precio actual y costo
        const productIds = items.map(i => i.productId);
        const products = await tx.product.findMany({
            where: { id: { in: productIds }, companyId },
            include: {
                costs: { orderBy: { createdAt: 'desc' }, take: 1 },
                // Importante: Consultamos el stock "dentro" de la transacción.
                // Al haber llamado a registerStockEntry arriba (dentro de la misma tx),
                // el stock que lea aquí YA INCLUYE la devolución.
                stocks: { where: { warehouseId: oldOrder.warehouseId } }
            }
        });

        if (products.length !== productIds.length) {
            throw new AppError('Uno o más productos no existen', 404);
        }

        let newSubtotal = new Prisma.Decimal(0);
        const newItemsData = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            
            // Cantidad solicitada
            const reqQty = new Prisma.Decimal(item.quantity);
            
            // Stock disponible (ya sumado lo devuelto)
            const currentStock = new Prisma.Decimal(product.stocks[0]?.quantity || 0);

            if (currentStock.lt(reqQty)) {
                throw new AppError(`Stock insuficiente para ${product.name} (Disponible: ${currentStock})`, 409);
            }

            // Precios
            const basePrice = item.basePrice !== undefined 
                ? new Prisma.Decimal(item.basePrice) 
                : new Prisma.Decimal(product.price);
            
            const lineTotal = basePrice.mul(reqQty);
            const cost = new Prisma.Decimal(product.costs[0]?.cost || 0);

            newSubtotal = newSubtotal.add(lineTotal);

            newItemsData.push({
                productId: item.productId,
                quantity: reqQty,
                basePrice: basePrice,
                price: lineTotal,
                cost: cost
            });
        }

        // 4. CALCULAR TOTALES FINALES
        // Usamos los valores nuevos si vienen, o mantenemos los viejos si son undefined
        const finalDiscount = discount !== undefined 
            ? new Prisma.Decimal(discount) 
            : new Prisma.Decimal(oldOrder.discount || 0);
            
        const finalDelivery = deliveryFee !== undefined 
            ? new Prisma.Decimal(deliveryFee) 
            : new Prisma.Decimal(oldOrder.deliveryFee || 0);

        let taxableBase = newSubtotal.sub(finalDiscount);
        if (taxableBase.isNegative()) taxableBase = new Prisma.Decimal(0);

        const newTotal = taxableBase.add(finalDelivery);

        // Validar que el nuevo total no sea menor a lo que YA pagó el cliente
        // (Para evitar que la orden quede con saldo negativo a favor sin control)
        const payments = await tx.orderPayment.findMany({ where: { orderId } });
        const totalPaid = payments.reduce((acc, p) => acc.add(new Prisma.Decimal(p.amount)), new Prisma.Decimal(0));

        // Actualizamos estado de pago según el nuevo total
        let newPaymentStatus = PaymentStatus.PENDING;
        if (totalPaid.gte(newTotal)) newPaymentStatus = PaymentStatus.PAID;

        // 5. ACTUALIZAR ORDEN Y RESERVAR NUEVO STOCK
        
        // A. Registrar la SALIDA de stock nueva
        const newStockExitItems = newItemsData.map(i => ({
            productId: i.productId,
            quantity: i.quantity
        }));

        await stockService.registerStockExit(
            companyId,
            oldOrder.warehouseId,
            newStockExitItems,
            oldOrder.id,
            userId,
            tx,
            StockReferenceType.ORDER_RESERVATION
        );

        // B. Actualizar la tabla Order
        const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
                subtotal: newSubtotal,
                discount: finalDiscount,
                deliveryFee: finalDelivery,
                total: newTotal,
                paymentStatus: newPaymentStatus,
                notes: notes !== undefined ? notes : oldOrder.notes,
                // Lógica "Replace": Borramos items viejos y creamos nuevos
                items: {
                    deleteMany: {}, 
                    create: newItemsData.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        basePrice: i.basePrice,
                        price: i.price,
                        cost: i.cost
                    }))
                }
            },
            include: { items: true }
        });

        return updatedOrder;
    });
};

// ==========================================
// 4. ESTADOS (Traffic Cop)
// ==========================================

export const updateOrderStatus = async (companyId, orderId, newStatus, userId) => {
    return await prisma.$transaction(async (tx) => {
        if (newStatus === OrderStatus.CONFIRMED) return await confirmOrder(tx, companyId, orderId);
        if (newStatus === OrderStatus.CANCELED) return await cancelOrder(tx, companyId, orderId, userId);
        return await updateStatusSimple(tx, companyId, orderId, newStatus);
    });
};

// Helpers de estado (Actualizados con Enums)
const confirmOrder = async (tx, companyId, orderId) => {
    const order = await tx.order.findFirst({ where: { id: orderId, companyId } });
    if (!order) throw new AppError('Orden no encontrada', 404);
    if (order.status !== OrderStatus.PENDING) throw new AppError('Estado inválido', 409);
    return await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CONFIRMED } });
};

const cancelOrder = async (tx, companyId, orderId, userId) => {
    const order = await tx.order.findFirst({ where: { id: orderId, companyId }, include: { items: true } });
    if (!order) throw new AppError('Orden no encontrada', 404);
    if (order.status === OrderStatus.CANCELED) return order;

    // Devolver stock
    const stockItems = order.items.map(i => ({ productId: i.productId, quantity: i.quantity }));
    await stockService.registerStockEntry(companyId, order.warehouseId, stockItems, order.id, userId, tx, StockReferenceType.ORDER_RESERVATION);

    return await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELED } });
};

const updateStatusSimple = async (tx, companyId, orderId, status) => {
    const order = await tx.order.findFirst({ where: { id: orderId, companyId } });
    if (!order) throw new AppError('Orden no encontrada', 404);
    
    const updated = await tx.order.update({ where: { id: orderId }, data: { status } });

    // Si se entrega y ya estaba pagada, se crea la venta
    if (status === OrderStatus.DELIVERED && order.paymentStatus === PaymentStatus.PAID) {
        const existingSale = await tx.sale.findFirst({ where: { orderId } });
        if (!existingSale) await salesService.createSaleFromOrder(orderId, tx);
    }
    return updated;
};

// ==========================================
// LECTURAS (Getters)
// ==========================================
export const getOrders = async (companyId, filters = {}) => {
    // ... (Tu código actual está bien, solo asegúrate de no usar parseFloat en la respuesta si quieres strings precisos)
    // Prisma devuelve Decimal como objeto o string según config.
    // Sugiero dejarlo igual por ahora.
    
    // Solo corregir el filtro de status para usar Enum si es necesario, 
    // pero Prisma acepta string si coincide con el Enum.
    const { page = 1, limit = 10, status, paymentStatus } = filters;
    const skip = (page - 1) * limit;
    const where = { companyId, ...(status && { status }), ...(paymentStatus && { paymentStatus }) };
    
    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where, skip, take: limit, orderBy: { createdAt: 'desc' },
            include: {
                items: true,
                customer: { select: { name: true } },
                warehouse: { select: { name: true } }
            }
        }),
        prisma.order.count({ where })
    ]);
    return { data: orders, pagination: { page, limit, total, pages: Math.ceil(total/limit) } };
};

export const getOrderById = async (companyId, orderId) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, companyId },
        include: {
            items: { include: { product: true } },
            payments: true,
            customer: true,
            warehouse: true
        }
    });
    if (!order) throw new AppError('Orden no encontrada', 404);
    return order;
};