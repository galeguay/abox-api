import * as movementService from './stock-movements.service.js';
// Importamos el servicio de stock porque es el encargado de la lógica transaccional (actualizar saldo + log)
import * as stockService from '../stock/stock.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

// ==================== LECTURA (Historial) ====================

export const getStockMovements = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { page, limit, type, startDate, endDate, productId, warehouseId } = req.query;

    const result = await movementService.getStockMovements(
        companyId,
        {
            page: page ? parseInt(page) : 1,
            limit: limit ? parseInt(limit) : 10,
            type,
            startDate,
            endDate,
            productId,
            warehouseId
        }
    );

    res.json({ ok: true, data: result });
});

// ==================== ESCRITURA (Acciones) ====================

/**
 * Crea un ajuste manual (Entrada/Salida/Ajuste).
 * Delega a stockService para asegurar atomicidad.
 */
export const createStockMovement = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const userId = req.user.sub; // Asumiendo que el ID viene del token JWT

    const result = await stockService.createManualAdjustment(
        companyId,
        req.body,
        userId
    );

    res.status(201).json({ ok: true, data: result });
});

/**
 * Realiza una transferencia entre almacenes.
 */
export const transferStock = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const userId = req.user.sub;

    const result = await stockService.transferStock(
        companyId,
        req.body,
        userId
    );

    res.status(201).json({ ok: true, data: result });
});