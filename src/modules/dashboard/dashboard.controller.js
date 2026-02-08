import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as dashboardService from './dashboard.service.js';

export const getDashboardStats = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;
    // Capturamos los query params enviados por el frontend
    const { from, to, period } = req.query; 

    const stats = await dashboardService.getDashboardStats(companyId, {
        startDate: from,
        endDate: to,
        period: period
    });

    res.json({
        success: true,
        data: stats,
    });
});