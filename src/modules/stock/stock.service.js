import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';
import * as movementService from '../stock-movements/stock-movements.service.js';

// ==========================================
// LÓGICA CORE (Orquestador)
// ==========================================

/**
 * Actualiza el saldo Y registra el movimiento.
 * Esta es la función que usan todos los métodos públicos.
 */
const processStockChange = async (params, tx) => {
    const { 
        companyId, warehouseId, productId, type, quantity, 
        referenceType, referenceId, notes, userId 
    } = params;

    const qty = parseFloat(quantity);
    if (qty <= 0) return;

    // 1. Delegar el log al servicio de movimientos
    await movementService.logStockMovement({
        companyId, warehouseId, productId, type, quantity: qty,
        referenceType, referenceId, notes, userId
    }, tx);

    // 2. Calcular impacto en el saldo (Lógica de negocio)
    let increment = 0;
    if (type === 'IN' || type === 'ADJUST') increment = qty; // Asumiendo ADJUST positivo
    if (type === 'OUT') increment = -qty;

    // 3. Actualizar tabla de Saldos (Stock)
    await tx.stock.upsert({
        where: {
            productId_warehouseId: { productId, warehouseId },
        },
        update: { quantity: { increment } },
        create: {
            productId,
            warehouseId,
            quantity: increment, // Si no existía, empieza con esto
        },
    });
};

// ==========================================
// MÉTODOS PÚBLICOS (API & Helpers)
// ==========================================

export const transferStock = async (companyId, data, userId) => {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = data;

    if (fromWarehouseId === toWarehouseId) {
        throw new AppError('Origen y destino deben ser distintos', 400);
    }

    return await prisma.$transaction(async (tx) => {
        // Validar Stock
        const fromStock = await tx.stock.findUnique({
            where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } }
        });

        if (!fromStock || Number(fromStock.quantity) < quantity) {
            throw new AppError('Stock insuficiente', 409);
        }

        // Registrar SALIDA Origen
        await processStockChange({
            companyId, warehouseId: fromWarehouseId, productId,
            type: 'OUT', quantity, referenceType: 'TRANSFER', referenceId: toWarehouseId,
            notes: notes || 'Salida por transferencia', userId
        }, tx);

        // Registrar ENTRADA Destino
        await processStockChange({
            companyId, warehouseId: toWarehouseId, productId,
            type: 'IN', quantity, referenceType: 'TRANSFER', referenceId: fromWarehouseId,
            notes: notes || 'Entrada por transferencia', userId
        }, tx);

        return { message: 'Transferencia exitosa' };
    });
};

export const createManualAdjustment = async (companyId, data, userId) => {
    const { productId, warehouseId, type, quantity, notes } = data;

    return await prisma.$transaction(async (tx) => {
        if (type === 'OUT') {
            const currentStock = await tx.stock.findUnique({
                where: { productId_warehouseId: { productId, warehouseId } }
            });
            if (!currentStock || Number(currentStock.quantity) < quantity) {
                throw new AppError('Stock insuficiente', 409);
            }
        }

        await processStockChange({
            companyId, warehouseId, productId, type, quantity,
            referenceType: 'ADJUSTMENT', referenceId: null, notes, userId
        }, tx);

        return { message: 'Ajuste realizado' };
    });
};

// Helpers para Ventas y Compras (Ahora exigen userId)
export const registerStockExit = async (companyId, warehouseId, items, referenceId, userId, tx) => {
    for (const item of items) {
        await processStockChange({
            companyId, warehouseId, productId: item.productId,
            type: 'OUT', quantity: item.quantity,
            referenceType: 'SALE', referenceId, notes: null, userId
        }, tx);
    }
};

export const registerStockEntry = async (companyId, warehouseId, items, referenceId, userId, tx) => {
    for (const item of items) {
        await processStockChange({
            companyId, warehouseId, productId: item.productId,
            type: 'IN', quantity: item.quantity,
            referenceType: 'PURCHASE', referenceId, notes: null, userId
        }, tx);
    }
};