import { Prisma } from '@prisma/client';
import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';
import * as stockService from '../stock/stock.service.js';
import * as salesService from '../sales/sales.service.js';

// ==========================================
// 1. CREACIÓN Y LECTURA
// ==========================================

export const createOrder = async (companyId, userId, data) => {
    // Ahora extraemos y validamos warehouseId (Opción 3 de arquitectura)
    const { customerId, items, deliveryZoneId, warehouseId, discount = 0, deliveryFee: manualDeliveryFee, notes } = data;

    if (!warehouseId) {
        throw new AppError('El ID del almacén es obligatorio para crear la orden', 400);
    }

    // Validar almacén
    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId, active: true },
    });
    if (!warehouse) throw new AppError('Almacén no válido o inactivo', 404);

    // Validar productos
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
        include: {
            costs: { orderBy: { createdAt: 'desc' }, take: 1 },
            stocks: {
                where: { warehouseId },
                take: 1
            }
        }
    });

    if (products.length !== productIds.length) {
        throw new AppError('Uno o más productos no existen en tu empresa', 404);
    }

    // Validar stock disponible en el almacén
    items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        const currentStock = product.stocks[0]?.quantity || 0;
        if (parseFloat(currentStock) < parseFloat(item.quantity)) {
            throw new AppError(`Stock insuficiente para: ${product.name}. Disponible: ${currentStock}`, 409);
        }
    });

    // Calcular totales
    let subtotal = 0;
    const itemsWithData = items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const itemTotal = parseFloat(item.basePrice) * parseFloat(item.quantity);
        subtotal += itemTotal;

        // Obtenemos el último costo registrado para reportes de ganancia
        const lastCost = product.costs?.[0]?.cost || 0;

        return {
            ...item,
            basePrice: parseFloat(item.basePrice),
            quantity: parseFloat(item.quantity),
            discount: item.discount ? parseFloat(item.discount) : 0,
            price: itemTotal - (item.discount ? parseFloat(item.discount) : 0),
            cost: parseFloat(lastCost),
        };
    });

    subtotal = parseFloat(subtotal.toFixed(2));
    const totalDiscount = parseFloat(discount);

    // Lógica de Delivery
    let finalDeliveryFee = 0;

    // Caso A: ¿Vino un precio manual? (Chequeamos undefined para permitir enviar 0)
    if (manualDeliveryFee !== undefined && manualDeliveryFee !== null) {
        finalDeliveryFee = parseFloat(manualDeliveryFee);

        // Opcional: Si mandan zona ID solo para registro, verificamos que exista, pero no cobramos su precio
        if (deliveryZoneId) {
            const zone = await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
            if (!zone) throw new AppError('Zona de delivery no válida', 404);
        }

    }
    // Caso B: No hay precio manual, pero hay Zona
    else if (deliveryZoneId) {
        const zone = await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } });
        if (!zone) throw new AppError('Zona de delivery no válida', 404);

        finalDeliveryFee = parseFloat(zone.price);
    }

    const total = parseFloat((subtotal - totalDiscount + finalDeliveryFee).toFixed(2));

    // Crear orden
    const order = await prisma.order.create({
        data: {
            companyId,
            createdById: userId,
            warehouseId,
            customerId: customerId || null,
            status: 'PENDING',
            subtotal,
            discount: totalDiscount,
            total,
            deliveryZoneId: deliveryZoneId || null,
            deliveryFee: finalDeliveryFee,
            paymentStatus: 'OPEN',
            notes,
            items: {
                create: itemsWithData,
            },
        },
        include: {
            items: {
                include: { product: { select: { id: true, name: true, sku: true } } },
            },
            createdBy: { select: { id: true, email: true } },
            customer: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
        },
    });

    return order;
};

export const getOrders = async (companyId, filters = {}) => {
    const { page = 1, limit = 10, status, paymentStatus } = filters;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
    };

    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                items: { select: { id: true, quantity: true, price: true } },
                customer: { select: { id: true, name: true } },
                createdBy: { select: { id: true, email: true } },
                warehouse: { select: { name: true } }, // Útil para ver de dónde salió
                _count: { select: { payments: true } },
            },
        }),
        prisma.order.count({ where }),
    ]);

    return {
        data: orders.map(order => ({
            ...order,
            totalItems: order.items.reduce((sum, i) => sum + parseFloat(i.quantity), 0),
        })),
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

export const getOrderById = async (companyId, orderId) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, companyId },
        include: {
            items: {
                include: { product: { select: { id: true, name: true, sku: true } } },
            },
            payments: { orderBy: { createdAt: 'desc' } },
            customer: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, email: true } },
            deliveryZone: { select: { id: true, name: true } },
            warehouse: { select: { id: true, name: true } },
        },
    });

    if (!order) {
        throw new AppError('Orden no encontrada', 404);
    }

    const amountPaid = order.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const pendingPayment = parseFloat(order.total) - amountPaid;

    return {
        ...order,
        amountPaid: parseFloat(amountPaid.toFixed(2)),
        pendingPayment: parseFloat(pendingPayment.toFixed(2)),
    };
};

// ==========================================
// 2. GESTIÓN DE ESTADOS (TRAFFIC COP)
// ==========================================
export const updateOrderStatus = async (companyId, orderId, newStatus, userId) => {
    return await prisma.$transaction(async (tx) => {

        if (newStatus === 'CONFIRMED') {
            return await confirmOrder(tx, companyId, orderId, userId);
        }

        if (newStatus === 'CANCELED') {
            return await cancelOrder(tx, companyId, orderId, userId);
        }

        return await updateStatusSimple(tx, companyId, orderId, newStatus);
    });
};

// --- Lógica Interna: Confirmar (Descuenta Stock) ---
const confirmOrder = async (tx, companyId, orderId, userId) => {
    const order = await tx.order.findFirst({
        where: { id: orderId, companyId },
        include: { items: true }
    });

    if (!order) throw new AppError('Orden no encontrada', 404);
    if (order.status !== 'PENDING') throw new AppError('Solo órdenes pendientes pueden confirmarse', 409);

    const stockItems = order.items.map(i => ({
        productId: i.productId,
        quantity: i.quantity
    }));

    await stockService.registerStockExit(
        companyId,
        order.warehouseId,
        stockItems,
        order.id,
        userId,
        tx
    );

    return await tx.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' }
    });
};


// --- Lógica Interna: Cancelar (Devuelve Stock si es necesario) ---
const cancelOrder = async (tx, companyId, orderId, userId) => {
    const order = await tx.order.findFirst({
        where: { id: orderId, companyId },
        include: { items: true }
    });

    if (!order) throw new AppError('Orden no encontrada', 404);
    if (order.status === 'CANCELED') throw new AppError('La orden ya está cancelada', 409);

    const stockWasDeducted = ['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'].includes(order.status);

    if (stockWasDeducted) {
        const stockItems = order.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity
        }));

        await stockService.registerStockEntry(
            companyId,
            order.warehouseId,
            stockItems,
            order.id,
            userId,
            tx
        );
    }

    return await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELED' }
    });
};

// --- Lógica Interna: Updates Simples ---
const updateStatusSimple = async (tx, companyId, orderId, status) => {
    const order = await tx.order.findFirst({
        where: { id: orderId, companyId }
    });

    if (!order) throw new AppError('Orden no encontrada', 404);

    if (order.status === 'PENDING') {
        throw new AppError('Debes confirmar la orden antes de cambiar a preparación o entrega', 400);
    }

    if (order.status === 'CANCELED') {
        throw new AppError('No se puede cambiar el estado de una orden cancelada', 400);
    }

    const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status }
    });

    // Crear venta solo una vez
    if (status === 'DELIVERED' && order.paymentStatus === 'PAID') {
        const existingSale = await tx.sale.findFirst({ where: { orderId } });
        if (!existingSale) {
            await salesService.createSaleFromOrder(orderId, tx);
        }
    }

    return updatedOrder;
};

// ==========================================
// 3. GESTIÓN DE ITEMS Y PAGOS
// ==========================================

export const addOrderItem = async (companyId, orderId, itemData) => {
    const { productId, quantity, basePrice } = itemData;

    return await prisma.$transaction(async (tx) => {

        const order = await tx.order.findFirst({
            where: { id: orderId, companyId },
        });

        if (!order) throw new AppError('Orden no encontrada', 404);
        if (order.status !== 'PENDING') {
            throw new AppError('Solo se pueden agregar items a órdenes pendientes', 409);
        }
        if (order.paymentStatus === 'PAID') {
            throw new AppError(
                'No se pueden agregar items a una orden que ya fue pagada.',
                409
            );
        }

        const product = await tx.product.findFirst({
            where: { id: productId, companyId },
            include: { costs: { orderBy: { createdAt: 'desc' }, take: 1 } }
        });

        if (!product) throw new AppError('Producto no encontrado', 404);

        const qty = parseFloat(quantity);
        const price = parseFloat(basePrice);
        const itemPrice = qty * price;
        const cost = product.costs?.[0]?.cost || 0;

        const item = await tx.orderItem.create({
            data: {
                orderId,
                productId,
                quantity: qty,
                basePrice: price,
                price: itemPrice,
                cost: parseFloat(cost),
            },
            include: { product: { select: { id: true, name: true, sku: true } } },
        });

        const newSubtotal = parseFloat(order.subtotal) + itemPrice;
        const newTotal =
            newSubtotal -
            parseFloat(order.discount || 0) +
            parseFloat(order.deliveryFee || 0);

        await tx.order.update({
            where: { id: orderId },
            data: {
                subtotal: newSubtotal,
                total: Math.max(newTotal, 0),
            },
        });

        await recalculatePaymentStatus(tx, orderId, Math.max(newTotal, 0));

        return item;
    });
};

export const deleteOrderItem = async (companyId, orderId, itemId) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, companyId },
    });

    if (!order) throw new AppError('Orden no encontrada', 404);

    if (order.status !== 'PENDING') {
        throw new AppError('Solo se pueden eliminar items de órdenes pendientes', 409);
    }

    if (order.paymentStatus === 'PAID') {
        throw new AppError('No se pueden eliminar items de una orden pagada. Esto generaría una inconsistencia financiera.', 409);
    }

    const item = await prisma.orderItem.findFirst({
        where: { id: itemId, orderId },
    });

    if (!item) throw new AppError('Item no encontrado', 404);

    await prisma.orderItem.delete({ where: { id: itemId } });

    // Actualizar totales
    const newSubtotal = parseFloat(order.subtotal) - parseFloat(item.price);
    const newTotal = newSubtotal - parseFloat(order.discount || 0) + parseFloat(order.deliveryFee || 0);

    // CORRECCIÓN: Usar transacción implicita o pasar prisma
    await prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id: orderId },
            data: { subtotal: newSubtotal, total: Math.max(newTotal, 0) },
        });
        // IMPORTANTE: Recalcular si ahora está pagada
        await recalculatePaymentStatus(tx, orderId, Math.max(newTotal, 0));
    });

    return { message: 'Item eliminado exitosamente' };
};

export const addOrderPayment = async (companyId, orderId, paymentData, userId) => {
    const { amount, paymentMethod, reference } = paymentData;

    // Iniciamos una transacción para que todo ocurra o nada ocurra
    return await prisma.$transaction(async (tx) => {
        // 1. Buscamos la orden DENTRO de la transacción
        const order = await tx.order.findFirst({
            where: { id: orderId, companyId },
            include: { payments: true },
        });

        if (!order) throw new AppError('Orden no encontrada', 404);

        const paymentAmount = new Prisma.Decimal(amount); // Usamos Decimal para evitar errores

        // Calculamos cuánto lleva pagado (sumando lo anterior + lo actual)
        const currentPaid = order.payments.reduce((sum, p) => sum.plus(p.amount), new Prisma.Decimal(0));
        const totalPaid = currentPaid.plus(paymentAmount);
        const orderTotal = new Prisma.Decimal(order.total);

        // Validación: No pagar de más (opcional, depende de tu negocio)
        if (totalPaid.greaterThan(orderTotal)) {
            throw new AppError(`El monto excede el total de la orden`, 409);
        }

        // 2. Crear el registro del Pago de la Orden
        const payment = await tx.orderPayment.create({
            data: {
                orderId,
                amount: paymentAmount,
                paymentMethod,
                reference: reference || null,
            },
        });

        // 3. Crear el Movimiento de Caja (MoneyMovement)
        // Esto asegura que la plata aparezca en tus reportes financieros
        await tx.moneyMovement.create({
            data: {
                companyId,
                type: 'IN', // Es un ingreso
                amount: paymentAmount,
                paymentMethod,
                referenceType: 'ORDER', // Según tu Schema 
                referenceId: orderId,
                description: `Cobro Orden #${order.id.split('-')[0]}`, // Descripción corta
                createdById: userId, // Importante registrar quién cobró
                createdAt: new Date(),
                // categoryId: ... Aquí podrías buscar una categoría por defecto "Ventas" si quisieras
            },
        });

        // 4. Actualizar estado de la orden
        let paymentStatus = 'PENDING';

        // Usamos una pequeña tolerancia (epsilon) para comparaciones decimales o comparación directa
        if (totalPaid.greaterThanOrEqualTo(orderTotal)) {
            paymentStatus = 'PAID';
        }

        await tx.order.update({
            where: { id: orderId },
            data: { paymentStatus },
        });

        if (paymentStatus === 'PAID' && order.status === 'DELIVERED') {

            const existingSale = await tx.sale.findFirst({ where: { orderId } });

            if (!existingSale) {
                await salesService.createSaleFromOrder(orderId, tx);
            }
        }

        return payment;
    });
};

export const updateOrderDetails = async (companyId, orderId, data) => {
    const { deliveryFee, discount, notes } = data;

    return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findFirst({ where: { id: orderId, companyId } });
        if (!order) throw new AppError('Orden no encontrada', 404);

        if (order.status === 'CANCELED') {
            throw new AppError('No se puede editar una orden cancelada', 400);
        }

        if (order.status !== 'PENDING') {
            const isTryingToChangeNonNotes =
                deliveryFee !== undefined || discount !== undefined;

            if (isTryingToChangeNonNotes) {
                throw new AppError(
                    'Solo se pueden modificar las notas si la orden no está pendiente',
                    403
                );
            }
        }

        if (order.paymentStatus === 'PAID') {
            // Verificamos si intentan cambiar algo financiero (deliveryFee o discount)
            const isTryingToChangeFinancials = (deliveryFee !== undefined) || (discount !== undefined);

            if (isTryingToChangeFinancials) {
                throw new AppError('La orden está pagada. Solo puedes modificar las notas, no los montos.', 403);
            }
        }

        let newTotal = undefined; // Solo calculamos si hay cambios financieros

        // Si NO está pagada y mandaron cambios financieros, recalculamos
        if (order.paymentStatus !== 'PAID' && (deliveryFee !== undefined || discount !== undefined)) {
            const finalDeliveryFee = deliveryFee !== undefined ? new Prisma.Decimal(deliveryFee) : new Prisma.Decimal(order.deliveryFee || 0);
            const finalDiscount = discount !== undefined ? new Prisma.Decimal(discount) : new Prisma.Decimal(order.discount || 0);

            newTotal = new Prisma.Decimal(order.subtotal)
                .minus(finalDiscount)
                .plus(finalDeliveryFee);

            if (newTotal.isNegative()) throw new AppError('El total no puede ser negativo', 400);
        }

        // Ejecutar Update
        const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
                // Si mandaron el dato, lo usamos. Si no, undefined (Prisma lo ignora)
                deliveryFee: deliveryFee !== undefined ? deliveryFee : undefined,
                discount: discount !== undefined ? discount : undefined,
                total: newTotal, // Se actualiza solo si recalculamos
                notes: notes !== undefined ? notes : undefined // Notas siempre pasan
            }
        });

        // Si cambió el total, hay que verificar si el pago parcial ahora cubre todo (Recalculation Trigger)
        if (newTotal) {
            await recalculatePaymentStatus(tx, orderId, newTotal);
        }

        return updatedOrder;
    });
};

const recalculatePaymentStatus = async (tx, orderId, currentTotal) => {
    // 1. Sumar todo lo pagado
    const paymentAgg = await tx.orderPayment.aggregate({
        where: { orderId },
        _sum: { amount: true }
    });

    const totalPaid = new Prisma.Decimal(paymentAgg._sum.amount || 0);
    const totalOrder = new Prisma.Decimal(currentTotal);

    let newStatus = 'OPEN';

    if (totalPaid.greaterThanOrEqualTo(totalOrder)) {
        newStatus = 'PAID';
    } else if (totalPaid.greaterThan(0)) {
        newStatus = 'PENDING';
    }

    // 2. Actualizar
    await tx.order.update({
        where: { id: orderId },
        data: { paymentStatus: newStatus }
    });
};