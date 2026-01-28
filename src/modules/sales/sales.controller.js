import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as salesService from './sales.service.js';

export const createSale = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { userId } = req.user;

    // Solo extraemos lo necesario, nada de legacy fields
    const {
        items,
        warehouseId,
        customerId,
        discount,
        payments,      // Array de pagos
        updateStock,
        saleCategoryId // Agregado por si faltaba
    } = req.body;

    const sale = await salesService.createSale(companyId, userId, {
        items,
        warehouseId,
        customerId,
        discount,
        payments, 
        updateStock,
        saleCategoryId
    });

    res.status(201).json({
        success: true,
        message: 'Venta registrada exitosamente',
        data: sale,
    });
});

export const getSales = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    const { page, limit, startDate, endDate, paymentStatus, status } = req.query;

    const result = await salesService.getSales(companyId, {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        startDate,
        endDate,
        paymentStatus,
        status
    });

    res.json({
        success: true,
        ...result,
    });
});

export const getSaleById = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;

    const sale = await salesService.getSaleById(companyId, id);

    res.json({
        success: true,
        data: sale,
    });
});

export const cancelSale = asyncWrapper(async (req, res) => {
    const { companyId, id } = req.params;
    const { userId } = req.user;
    // Opcional: si el cliente necesita forzar el almacén de devolución
    const { warehouseId } = req.body;

    const sale = await salesService.cancelSale(companyId, id, userId, warehouseId);

    res.json({
        success: true,
        message: 'Venta anulada y stock devuelto exitosamente',
        data: sale,
    });
});