import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express'; 

import errorHandler from './middlewares/errorHandler.js';
// ... tus importaciones de rutas (sin cambios) ...
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import stockRoutes from './modules/stock/stock.routes.js';
import companyRoutes from './modules/company/company.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import productCategories from './modules/product-categories/product-categories.routes.js';
import warehousesRoutes from './modules/warehouses/warehouses.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import movementsRoutes from './modules/stock-movements/stock-movements.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import salesCategoriesRoutes from './modules/sales-categories/sales-categories.routes.js';
import moneyMovementsRoutes from './modules/money-movements/money-movements.routes.js';

import platformUsers from './modules/platform-users/platform-users.routes.js';
import platformCompaniesRoutes from './modules/platform-companies/platform-companies.routes.js';
import platformAdminRoutes from './platform/admin/platform.admin.routes.js';
import platformDashboardRoutes from './platform/dashboard/platform.dashboard.routes.js';
import platformAuditRoutes from './platform/audit/platform.audit.routes.js';
import platformSettingsRoutes from './platform/settings/platform.settings.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN DE SWAGGER ---
// Usamos process.cwd() para buscar siempre en la raíz del proyecto, 
// sin importar desde dónde se importa este archivo.
const swaggerPath = path.join(process.cwd(), 'swagger-output.json');

let swaggerFile;
try {
    if (fs.existsSync(swaggerPath)) {
        swaggerFile = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8'));
    }
} catch (error) {
    console.error("⚠️ Error cargando Swagger (continuando sin doc):", error.message);
}

// Documentación
if (swaggerFile) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
}

// --- RUTAS ---
app.use('/users', usersRoutes);
app.use('/auth', authRoutes);
app.use('/stock', stockRoutes);   
app.use('/company', companyRoutes);

app.use('/products', productsRoutes);
app.use('/categories', productCategories);
app.use('/warehouses', warehousesRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/movements', movementsRoutes);
app.use('/orders', ordersRoutes);
app.use('/sales', salesRoutes);
app.use('/sales-categories', salesCategoriesRoutes);
app.use('/money-movements', moneyMovementsRoutes);

// Plataforma
app.use('/platform/users', platformUsers);
app.use('/platform/admin', platformAdminRoutes);
app.use('/platform/companies', platformCompaniesRoutes);
app.use('/platform/dashboard', platformDashboardRoutes);
app.use('/platform/audit', platformAuditRoutes);
app.use('/platform/settings', platformSettingsRoutes);

// ⛔ Error Handler siempre al final
app.use(errorHandler);

// ¡IMPORTANTE! Aquí SOLO exportamos, NO hacemos app.listen
export default app;