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

    // 1. Extraemos TODOS los campos posibles del body
    const {
        // --- Columnas directas en el Schema ---
        name,
        taxId,      // [cite: 2]
        email,
        phone,      // [cite: 3]
        address,
        logoUrl,
        
        // --- Campos de configuración (van a JSON) ---
        description,
        city,
        state,
        zipCode,
        country,
        website
    } = req.body;

    // 2. Preparamos el objeto para el servicio
    const updateData = {
        // Datos de columnas
        name,
        taxId,
        email,
        phone,
        address,
        logoUrl,
        
        // Agrupamos el resto en un objeto para merging del JSON
        additionalConfig: {
            description,
            city,
            state,
            zipCode,
            country,
            website
        }
    };

    const updated = await companyService.updateMyCompanyProfile(companyId, userId, updateData);

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
    
    // Aquí recibimos objetos complejos (arrays u objetos anidados)
    const { operationalHours, internalPolicies } = req.body;

    const updatedConfig = await companyService.updateMyCompanySettings(companyId, userId, {
        operationalHours,
        internalPolicies
    });

    res.json({
        success: true,
        message: 'Configuración de empresa actualizada exitosamente',
        data: updatedConfig,
    });
});