import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as companyService from './company.service.js';

export const getMyCompanyProfile = asyncWrapper(async (req, res) => {
  const { userId } = req.user;
  const profile = await companyService.getMyCompanyProfile(userId);

  res.json({
    success: true,
    data: profile,
  });
});

export const updateMyCompanyProfile = asyncWrapper(async (req, res) => {
  const { userId, companyId } = req.user;
  const { name, description, phone, email, address, city, state, zipCode, country } = req.body;

  const updated = await companyService.updateMyCompanyProfile(companyId, userId, {
    name: name ?? undefined,
  });

  res.json({
    success: true,
    message: 'Perfil de empresa actualizado exitosamente',
    data: updated,
  });
});

export const getMyCompanyStats = asyncWrapper(async (req, res) => {
  const { userId, companyId } = req.user;
  const stats = await companyService.getMyCompanyStats(companyId, userId);

  res.json({
    success: true,
    data: stats,
  });
});

export const getMyCompanySettings = asyncWrapper(async (req, res) => {
  const { userId, companyId } = req.user;
  const settings = await companyService.getMyCompanySettings(companyId, userId);

  res.json({
    success: true,
    data: settings,
  });
});

export const updateMyCompanySettings = asyncWrapper(async (req, res) => {
  const { userId, companyId } = req.user;
  const { operationalHours, internalPolicies } = req.body;

  const updated = await companyService.updateMyCompanySettings(companyId, userId, {
    operationalHours: operationalHours ?? undefined,
    internalPolicies: internalPolicies ?? undefined,
  });

  res.json({
    success: true,
    message: 'Configuración de empresa actualizada exitosamente',
    data: updated,
  });
});
