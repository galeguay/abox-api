import {
    Prisma,
    SaleStatus,
    PaymentStatus,
    MovementType,
    MoneyReferenceType,
    StockReferenceType, // Agregado para movimientos de stock
    PurchaseStatus,      // Por si acaso
    OrderStatus         // Por si acaso
} from '@prisma/client';
import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';
import * as stockService from '../stock/stock.service.js';

// ==========================================
// 1. CREACIÓN DE VENTA (Transaccional)
// ==========================================

export const createSale = async (companyId, userId, data) => {
    const {
        items,
        warehouseId,
        customerId,
        saleCategoryId,
        discount = 0,
        payments = [], // Default a array vacío si no envían pagos
        updateStock = true
    } = data;

    // --- 1. Validaciones Previas ---
    if (!warehouseId) throw new AppError('El ID del almacén es obligatorio', 400);

    if (saleCategoryId) {
        const categoryExists = await prisma.saleCategory.findFirst({
            where: { id: saleCategoryId, companyId, active: true }
        });
        if (!categoryExists) throw new AppError('Categoría de venta inválida', 400);
    }

    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId, active: true },
    });
    if (!warehouse) throw new AppError('Almacén no válido o inactivo', 404);

    // --- 2. Preparación de Productos ---
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
        include: { costs: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (products.length !== productIds.length) {
        throw new AppError('Uno o más productos no existen', 404);
    }

    if (updateStock) { // Solo validamos si la venta descuenta stock
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);

            // Buscamos el stock específico en el array que trajimos en el include
            const currentStockEntry = product.stocks[0];
            const currentStockQty = currentStockEntry ? Number(currentStockEntry.quantity) : 0;
            const requestedQty = Number(item.quantity);

            // Regla de Negocio: No vender si no hay suficiente
            if (currentStockQty < requestedQty) {
                throw new AppError(
                    `Stock insuficiente para el producto: ${product.name}. Disponible: ${currentStockQty}, Solicitado: ${requestedQty}`,
                    409 // 409 Conflict es el código HTTP correcto para esto
                );
            }
        }
    }

    // --- 3. Cálculos Financieros ---
    let subtotal = new Prisma.Decimal(0);

    const itemsWithData = items.map(item => {
        const product = products.find(p => p.id === item.productId);

        const qty = new Prisma.Decimal(item.quantity);
        const price = new Prisma.Decimal(item.price);
        const itemDiscount = new Prisma.Decimal(item.discount || 0);
        const lastCost = new Prisma.Decimal(product.costs?.[0]?.cost || 0);

        const itemSubtotal = price.mul(qty);
        subtotal = subtotal.add(itemSubtotal);

        return {
            productId: item.productId,
            quantity: qty,
            price: price,
            basePrice: price,
            discount: itemDiscount,
            cost: lastCost
        };
    });

    const totalDiscount = new Prisma.Decimal(discount);
    const total = subtotal.sub(totalDiscount);

    if (total.isNegative()) {
        throw new AppError('El descuento no puede ser mayor al total de la venta', 400);
    }

    // --- 4. Procesamiento de Pagos ---
    // Ya no hay "if legacy", usamos directamente el array
    let totalPaidAmount = new Prisma.Decimal(0);

    const preparedPayments = payments.map(p => {
        const amount = new Prisma.Decimal(p.amount);
        totalPaidAmount = totalPaidAmount.add(amount);
        return {
            paymentMethod: p.paymentMethod,
            amount: amount
        };
    });

    // Validar sobrepago (Opcional, a veces se permite propina o saldo a favor)
    // if (totalPaidAmount.gt(total)) ... 

    let currentPaymentStatus = PaymentStatus.PENDING;
    if (totalPaidAmount.gte(total)) {
        currentPaymentStatus = PaymentStatus.PAID;
    } else if (totalPaidAmount.gt(0)) {
        currentPaymentStatus = PaymentStatus.PENDING;
    }

    if (customerId) {
        const customerExists = await prisma.customer.findFirst({
            where: { id: customerId, companyId, active: true }
        });
        if (!customerExists) throw new AppError('El cliente seleccionado no es válido', 404);
    }

    // --- 5. Transacción Atómica ---
    const sale = await prisma.$transaction(async (tx) => {
        // A. Crear Venta
        const newSale = await tx.sale.create({
            data: {
                companyId,
                createdById: userId,
                saleCategoryId: saleCategoryId || null,
                subtotal: subtotal,
                discount: totalDiscount,
                total: total,
                paymentStatus: currentPaymentStatus,
                warehouseId,
                status: SaleStatus.COMPLETED,
                customerId: customerId || null,
                items: {
                    create: itemsWithData.map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        price: i.price,
                        basePrice: i.basePrice,
                        discount: i.discount,
                        cost: i.cost
                    }))
                }
            },
            include: { items: true }
        });

        // B. Stock
        if (updateStock) {
            const stockItems = itemsWithData.map(i => ({
                productId: i.productId,
                quantity: i.quantity
            }));
            await stockService.registerStockExit(companyId, warehouseId, stockItems, newSale.id, userId, tx);
        }

        // C. Pagos
        if (preparedPayments.length > 0) {
            for (const payment of preparedPayments) {
                await tx.salePayment.create({
                    data: {
                        saleId: newSale.id,
                        amount: payment.amount,
                        paymentMethod: payment.paymentMethod
                    }
                });

                await tx.moneyMovement.create({
                    data: {
                        companyId,
                        type: MovementType.IN,
                        amount: payment.amount,
                        paymentMethod: payment.paymentMethod,
                        referenceType: MoneyReferenceType.SALE,
                        referenceId: newSale.id,
                        createdById: userId,
                        description: `Venta #${newSale.id.slice(0, 8)} (${payment.paymentMethod})`
                    }
                });
            }
        }

        return newSale;
    });

    return sale;
};


// ==========================================
// 2. LECTURA DE VENTAS
// ==========================================

export const getSales = async (companyId, filters = {}) => {
    const { page = 1, limit = 10, startDate, endDate, paymentStatus, status } = filters;
    const skip = (page - 1) * limit;

    const where = {
        companyId,
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(startDate && endDate && {
            createdAt: {
                gte: new Date(startDate),
                lte: new Date(endDate)
            }
        })
    };

    const [sales, total] = await Promise.all([
        prisma.sale.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                items: { select: { quantity: true, price: true, product: { select: { name: true } } } },
                createdBy: { select: { email: true } },
                warehouse: { select: { name: true } },
                _count: { select: { items: true } }
            }
        }),
        prisma.sale.count({ where })
    ]);

    return {
        data: sales,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        }
    };
};

export const getSaleById = async (companyId, saleId) => {
    const sale = await prisma.sale.findFirst({
        where: { id: saleId, companyId },
        include: {
            items: {
                include: { product: { select: { id: true, name: true, sku: true } } }
            },
            payments: true,
            createdBy: { select: { id: true, email: true } },
            saleCategory: true,
            warehouse: { select: { id: true, name: true } }
        }
    });

    if (!sale) throw new AppError('Venta no encontrada', 404);

    return sale;
};

// ==========================================
// 3. ANULACIÓN / DEVOLUCIÓN
// ==========================================

export const cancelSale = async (companyId, saleId, userId, warehouseIdParam) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Obtener la venta con sus pagos e items
        const sale = await tx.sale.findFirst({
            where: { id: saleId, companyId },
            include: { items: true, payments: true }
        });

        if (!sale) throw new AppError('Venta no encontrada', 404);

        // 2. Validar que no esté ya anulada
        if (sale.status === SaleStatus.CANCELED) {
            throw new AppError('Esta venta ya fue anulada previamente', 409);
        }

        // 3. Determinar almacén de destino
        const targetWarehouseId = warehouseIdParam || sale.warehouseId;
        if (!targetWarehouseId) {
            throw new AppError('No se puede determinar el almacén para devolver el stock.', 400);
        }

        // 4. Devolución de Stock (Stock Entry)
        const stockItems = sale.items.map(i => ({
            productId: i.productId,
            quantity: i.quantity
        }));

        await stockService.registerStockEntry(
            companyId,
            targetWarehouseId,
            stockItems,
            sale.id,
            userId,
            tx,
            StockReferenceType.SALE
        );

        // 5. REEMBOLSO DINÁMICO (Mejora Profesional)
        // En lugar de un solo movimiento CASH, replicamos cada pago como salida
        if (sale.payments.length > 0) {
            for (const payment of sale.payments) {
                await tx.moneyMovement.create({
                    data: {
                        companyId,
                        type: MovementType.OUT, //
                        amount: payment.amount, // Usamos el monto exacto del pago original
                        paymentMethod: payment.paymentMethod, // Mismo método que se usó al cobrar
                        referenceType: MoneyReferenceType.SALE,
                        referenceId: sale.id,
                        description: `Reembolso Venta #${sale.id.slice(0, 8)} - Anulación`,
                        createdById: userId
                    }
                });
            }
        }

        // 6. Actualizar estado de la venta
        const updatedSale = await tx.sale.update({
            where: { id: saleId },
            data: {
                status: SaleStatus.CANCELED,
                paymentStatus: 'PENDING' // Opcional: marcar como pendiente si el dinero salió
            },
            include: { items: true }
        });

        return updatedSale;
    });
};

/**
 * Crea una venta a partir de una orden confirmada.
 */
export const createSaleFromOrder = async (orderId, tx) => {
    const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
    });

    if (!order) throw new AppError('Orden no encontrada', 404);

    const sale = await tx.sale.create({
        data: {
            companyId: order.companyId,
            orderId: order.id,
            createdById: order.createdById || '',
            warehouseId: order.warehouseId,
            subtotal: order.subtotal,
            discount: order.discount,
            deliveryFee: order.deliveryFee,
            total: order.total,
            status: SaleStatus.COMPLETED, // Enum
            paymentStatus: order.paymentStatus,
            notes: `Venta generada desde Orden #${order.id.split('-')[0]}`,
            items: {
                create: order.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    basePrice: item.basePrice,
                    cost: item.cost,
                    discount: item.discount
                }))
            }
        }
    });

    // Actualizar referencia de stock (opcional)
    await tx.stockMovement.updateMany({
        where: {
            referenceType: StockReferenceType.ORDER_RESERVATION,
            referenceId: orderId
        },
        data: { notes: `Venta confirmada (Ticket: ${sale.id.split('-')[0]})` }
    });

    return sale;
};