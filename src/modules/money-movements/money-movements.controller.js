import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as moneyMovementsService from './money-movements.service.js';

export const createMoneyMovement = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { userId } = req.user;
  const { type, amount, paymentMethod, categoryId, description, reference, referenceType, referenceId } = req.body;

  const movement = await moneyMovementsService.createMoneyMovement(companyId, userId, {
    type,
    amount,
    paymentMethod,
    categoryId,
    description,
    reference,
    referenceType,
    referenceId,
  });

  res.status(201).json({
    success: true,
    message: 'Movimiento de dinero creado exitosamente',
    data: movement,
  });
});

export const getMoneyMovements = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { page, limit, type, paymentMethod, categoryId, startDate, endDate } = req.query;

  const result = await moneyMovementsService.getMoneyMovements(companyId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
    type,
    paymentMethod,
    categoryId,
    startDate,
    endDate,
  });

  res.json({
    success: true,
    ...result,
  });
});

export const getMoneyMovementById = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;

  const movement = await moneyMovementsService.getMoneyMovementById(companyId, id);

  res.json({
    success: true,
    data: movement,
  });
});

export const updateMoneyMovement = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;
  const { type, amount, paymentMethod, description } = req.body;

  const movement = await moneyMovementsService.updateMoneyMovement(companyId, id, {
    type,
    amount,
    paymentMethod,
    description,
  });

  res.json({
    success: true,
    message: 'Movimiento de dinero actualizado exitosamente',
    data: movement,
  });
});

export const deleteMoneyMovement = asyncWrapper(async (req, res) => {
  const { companyId, id } = req.params;

  const result = await moneyMovementsService.deleteMoneyMovement(companyId, id);

  res.json({
    success: true,
    message: result.message,
  });
});

export const getMoneyMovementsReport = asyncWrapper(async (req, res) => {
  const { companyId } = req.params;
  const { startDate, endDate } = req.query;

  const report = await moneyMovementsService.getMoneyMovementsReport(companyId, {
    startDate,
    endDate,
  });

  res.json({
    success: true,
    data: report,
  });
});
