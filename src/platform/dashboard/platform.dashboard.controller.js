import * as platformDashboardService from './platform.dashboard.service.js';
import asyncWrapper from '../../middlewares/asyncWrapper.js';

export const getDashboardStats = asyncWrapper(async (req, res) => {
  const result = await platformDashboardService.getDashboardStats();
  res.json({ ok: true, data: result });
});

export const getTopCompanies = asyncWrapper(async (req, res) => {
  const { limit = 5 } = req.query;
  const result = await platformDashboardService.getTopCompanies(parseInt(limit));
  res.json({ ok: true, data: result });
});

export const getRecentActivity = asyncWrapper(async (req, res) => {
  const { days = 7, limit = 20 } = req.query;
  const result = await platformDashboardService.getRecentActivity(
    parseInt(days),
    parseInt(limit)
  );
  res.json({ ok: true, data: result });
});

export const getMetricsByPeriod = asyncWrapper(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    return res.status(400).json({
      ok: false,
      message: 'startDate y endDate son requeridos',
    });
  }

  const result = await platformDashboardService.getMetricsByPeriod(
    startDate,
    endDate
  );
  res.json({ ok: true, data: result });
});

export const getUserDistribution = asyncWrapper(async (req, res) => {
  const { limit = 10 } = req.query;
  const result = await platformDashboardService.getUserDistribution(
    parseInt(limit)
  );
  res.json({ ok: true, data: result });
});

export const getSalesByCompany = asyncWrapper(async (req, res) => {
  const { limit = 10 } = req.query;
  const result = await platformDashboardService.getSalesByCompany(parseInt(limit));
  res.json({ ok: true, data: result });
});

export const getExecutiveSummary = asyncWrapper(async (req, res) => {
  const result = await platformDashboardService.getExecutiveSummary();
  res.json({ ok: true, data: result });
});
