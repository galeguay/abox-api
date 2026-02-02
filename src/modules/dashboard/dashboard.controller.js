import asyncWrapper from '../../middlewares/asyncWrapper.js';
import * as dashboardService from './dashboard.service.js';

export const getDashboardStats = asyncWrapper(async (req, res) => {
    const { companyId } = req.params;

    // Podríamos recibir query params si quisieras filtrar fechas en el futuro
    // const { startDate, endDate } = req.query; 

    const stats = await dashboardService.getDashboardStats(companyId);

    res.json({
        success: true,
        data: stats,
    });
});