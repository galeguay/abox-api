import {
    StockReferenceType
} from '@prisma/client';
import prisma from '../../../prisma/client.js';
import { AppError } from '../../errors/index.js';
import * as movementService from '../stock-movements/stock-movements.service.js';

// ==========================================
// LÓGICA CORE (Orquestador)
// ==========================================

/**
 * Actualiza el saldo de manera atómica y segura.
 * Garantiza que el stock NUNCA baje de 0 en operaciones de salida.
 */
const processStockChange = async (params, tx) => {
    const {
        companyId, warehouseId, productId, type, quantity,
        referenceType, referenceId, notes, userId
    } = params;

    const qty = parseFloat(quantity);
    if (qty <= 0) return;

    // 1. Validación Estricta de Tipos
    if (type !== 'IN' && type !== 'OUT') {
        throw new AppError(`Tipo de movimiento inválido: ${type}. Use IN o OUT.`, 500);
    }

    // 2. Delegar el log al servicio de movimientos
    await movementService.logStockMovement({
        companyId, warehouseId, productId, type, quantity: qty,
        referenceType, referenceId, notes, userId
    }, tx);

    // 3. Actualización Atómica de Saldos
    if (type === 'OUT') {
        // SEGURIDAD CRÍTICA: "Optimistic Locking"
        // Solo actualiza si la cantidad actual (quantity) es mayor o igual (gte) a la que queremos sacar (qty)
        const result = await tx.stock.updateMany({
            where: {
                productId,
                warehouseId,
                quantity: { gte: qty }
            },
            data: {
                quantity: { decrement: qty }
            }
        });

        // Si count es 0, significa que no cumplió la condición (no había suficiente stock)
        if (result.count === 0) {
            throw new AppError(`Stock insuficiente para el producto ${productId}. Movimiento rechazado.`, 409);
        }

    } else {
        // Caso 'IN' (Entrada): Upsert seguro
        await tx.stock.upsert({
            where: {
                productId_warehouseId: { productId, warehouseId },
            },
            update: { quantity: { increment: qty } }, // Suma atómica
            create: {
                productId,
                warehouseId,
                quantity: qty, // Valor inicial si no existe
            },
        });
    }
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

        // Registrar SALIDA Origen
        await processStockChange({
            companyId, warehouseId: fromWarehouseId, productId,
            type: 'OUT', quantity, referenceType: StockReferenceType.TRANSFER, referenceId: toWarehouseId,
            notes: notes || 'Salida por transferencia', userId
        }, tx);

        // Registrar ENTRADA Destino
        await processStockChange({
            companyId, warehouseId: toWarehouseId, productId,
            type: 'IN', quantity, referenceType: StockReferenceType.TRANSFER, referenceId: fromWarehouseId,
            notes: notes || 'Entrada por transferencia', userId
        }, tx);

        return { message: 'Transferencia exitosa' };
    });
};

export const createManualAdjustment = async (companyId, data, userId) => {
    const { productId, warehouseId, type, quantity, notes } = data;

    return await prisma.$transaction(async (tx) => {

        await processStockChange({
            companyId, warehouseId, productId, type, quantity,
            referenceType: StockReferenceType.ADJUSTMENT, referenceId: null, notes, userId
        }, tx);

        return { message: 'Ajuste realizado' };
    });
};

export const registerStockExit = async (companyId, warehouseId, items, referenceId, userId, tx, referenceType = StockReferenceType.SALE) => {

    // 1. Corrección: Validar contra el Enum real de Prisma
    if (!Object.values(StockReferenceType).includes(referenceType)) {
        throw new AppError(`Tipo de referencia de stock inválido: ${referenceType}`, 400);
    }

    for (const item of items) {
        // 2. Corrección: Generar notas dinámicas según el tipo
        let dynamicNotes = '';
        if (referenceType === StockReferenceType.SALE) {
            dynamicNotes = `Venta #${referenceId.split('-')[0]}`;
        } else if (referenceType === StockReferenceType.ORDER_RESERVATION) {
            dynamicNotes = `Reserva de stock para Orden #${referenceId.split('-')[0]}`;
        } else {
            dynamicNotes = `Salida de stock (${referenceType})`;
        }

        await processStockChange({
            companyId,
            warehouseId,
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            referenceType: referenceType, // 3. Corrección: Usar el parámetro, no hardcodear
            referenceId,
            notes: dynamicNotes,
            userId
        }, tx);
    }
};

export const registerStockEntry = async (companyId, warehouseId, items, referenceId, userId, tx) => {
    for (const item of items) {
        await processStockChange({
            companyId, warehouseId, productId: item.productId,
            type: 'IN', quantity: item.quantity,
            referenceType: StockReferenceType.PURCHASE, referenceId, notes: null, userId
        }, tx);
    }
};