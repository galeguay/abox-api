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
        paymentMethod,
        amountPaid,
        updateStock = true
    } = data;

    // --- 1. Validaciones Previas ---
    if (!warehouseId) {
        throw new AppError('El ID del almacén es obligatorio para descontar stock', 400);
    }

    if (saleCategoryId) {
        const categoryExists = await prisma.saleCategory.findFirst({
            where: { id: saleCategoryId, companyId, active: true }
        });
        if (!categoryExists) throw new AppError('Categoría de venta inválida', 400);
    }

    // Validar almacén activo
    const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId, active: true },
    });
    if (!warehouse) throw new AppError('Almacén no válido o inactivo', 404);

    // Validar productos y obtener costos (SNAPSHOT del costo actual)
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds }, companyId },
        include: { costs: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    if (products.length !== productIds.length) {
        throw new AppError('Uno o más productos no existen', 404);
    }

    // --- 2. Preparar Datos y Cálculos ---
    let subtotal = 0;

    const itemsWithData = items.map(item => {
        const product = products.find(p => p.id === item.productId);

        const qty = parseFloat(item.quantity);
        const price = parseFloat(item.price);
        const itemDiscount = item.discount ? parseFloat(item.discount) : 0;

        const itemSubtotal = (price * qty);
        subtotal += itemSubtotal;

        // Capturamos el último costo para reportes de ganancia futura
        const lastCost = product.costs?.[0]?.cost || 0;

        return {
            productId: item.productId,
            quantity: qty,
            price: price,
            basePrice: price,
            discount: itemDiscount,
            cost: parseFloat(lastCost)
        };
    });

    // Totales generales
    subtotal = parseFloat(subtotal.toFixed(2));
    const totalDiscount = parseFloat(discount);
    const total = parseFloat((subtotal - totalDiscount).toFixed(2));

    // Estado del pago
    const paidAmount = amountPaid ? parseFloat(amountPaid) : 0;
    const paymentStatus = paidAmount >= total ? 'PAID' : (paidAmount > 0 ? 'PENDING' : 'PENDING');

    // --- 3. TRANSACCIÓN ATÓMICA ---
    const sale = await prisma.$transaction(async (tx) => {

        // A. Crear la Venta
        const newSale = await tx.sale.create({
            data: {
                companyId,
                createdById: userId,
                saleCategoryId: saleCategoryId || null,
                subtotal,
                discount: totalDiscount,
                total,
                paymentStatus,
                warehouseId,
                status: 'COMPLETED',
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

        // B. Descontar Stock (Servicio Externo)
        if (updateStock) {
            const stockItems = itemsWithData.map(i => ({
                productId: i.productId,
                quantity: i.quantity
            }));

            await stockService.registerStockExit(
                companyId,
                warehouseId,
                stockItems,
                newSale.id,
                userId,
                tx
            );
        }

        // C. Registrar Pago y Movimiento de Caja (si aplica)
        if (paidAmount > 0 && paymentMethod) {
            // 1. Registro del pago en la venta
            await tx.salePayment.create({
                data: {
                    saleId: newSale.id,
                    amount: paidAmount,
                    paymentMethod: paymentMethod
                }
            });

            // 2. Impacto en la Caja (MoneyMovement)
            await tx.moneyMovement.create({
                data: {
                    companyId,
                    type: 'IN',
                    amount: paidAmount,
                    paymentMethod: paymentMethod,
                    referenceType: 'SALE',
                    referenceId: newSale.id,
                    createdById: userId,
                    description: `Venta #${newSale.id.slice(0, 8)}`
                }
            });
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
        ...(status && { status }), // Filtro por estado (COMPLETED / CANCELED)
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
                warehouse: { select: { name: true } }, // Útil para ver origen
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
        // 1. Buscar la venta
        const sale = await tx.sale.findFirst({
            where: { id: saleId, companyId },
            include: { items: true, payments: true }
        });

        if (!sale) throw new AppError('Venta no encontrada', 404);

        // 2. Validar estado
        if (sale.status === 'CANCELED') {
            throw new AppError('Esta venta ya fue anulada previamente', 409);
        }

        // 3. Determinar Almacén de devolución
        // Usamos el guardado en la venta, o el parámetro manual si es un registro antiguo
        const targetWarehouseId = sale.warehouseId || warehouseIdParam;

        if (!targetWarehouseId) {
            throw new AppError('No se puede determinar el almacén para devolver el stock. Por favor envíalo manualmente.', 400);
        }

        // 4. Devolver Stock (IN)
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
            tx
        );

        // 5. Registrar salida de dinero (Reembolso)
        // Solo si hubo pagos registrados previamente
        const totalPaid = sale.payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);

        if (totalPaid > 0) {
            await tx.moneyMovement.create({
                data: {
                    companyId,
                    type: 'OUT', // Egreso
                    amount: totalPaid,
                    paymentMethod: 'CASH', // Default a efectivo o lógica de reembolso
                    referenceType: 'SALE',
                    referenceId: sale.id,
                    description: `Anulación Venta #${sale.id.slice(0, 8)}`,
                    createdById: userId
                }
            });
        }

        // 6. Actualizar estado de la venta
        const updatedSale = await tx.sale.update({
            where: { id: saleId },
            data: { status: 'CANCELED' },
            include: { items: true }
        });

        return updatedSale;
    });
};

// sales.service.js

// Función para convertir Orden -> Venta (Solo para reportes, sin mover stock/dinero)
export const createSaleFromOrder = async (orderId, tx) => {
    // 1. Buscamos la orden
    const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
    });

    if (!order) throw new Error("Orden no encontrada al intentar convertir a venta");

    // 2. Mapeamos los items
    const saleItemsData = order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        basePrice: item.basePrice,
        discount: item.discount,
        cost: item.cost // Mantenemos el costo histórico
    }));

    // 3. Crear la Venta
    return await tx.sale.create({
        data: {
            companyId: order.companyId,
            createdById: order.createdById || "SYSTEM",
            subtotal: order.subtotal,
            discount: order.discount,
            total: order.total,
            deliveryFee: order.deliveryFee,
            paymentStatus: 'PAID', // Asumimos pagado al entregar
            status: 'COMPLETED',
            warehouseId: order.warehouseId,
            orderId: order.id, // <--- Vinculación clave
            customerId: order.customerId,
            items: {
                create: saleItemsData
            }
        }
    });
};