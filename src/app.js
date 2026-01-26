import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import cors from 'cors';

import errorHandler from './middlewares/errorHandler.js';
import usersRoutes from './modules/users/users.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import platformAuthRoutes from './platform/auth/platform.auth.routes.js';
import platformAdminRoutes from './platform/admin/platform.admin.routes.js';
import platformCompaniesRoutes from './platform/companies/platform.companies.routes.js';
import platformDashboardRoutes from './platform/dashboard/platform.dashboard.routes.js';
import platformAuditRoutes from './platform/audit/platform.audit.routes.js';
import platformSettingsRoutes from './platform/settings/platform.settings.routes.js';
import stockRoutes from './modules/stock/stock.routes.js';
import companyRoutes from './modules/company/company.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import warehousesRoutes from './modules/warehouses/warehouses.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import movementsRoutes from './modules/movements/movements.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import salesCategoriesRoutes from './modules/sales-categories/sales-categories.routes.js';
import moneyMovementsRoutes from './modules/money-movements/money-movements.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/users', usersRoutes);
app.use('/auth', authRoutes);
app.use(stockRoutes);
app.use(companyRoutes);
app.use(productsRoutes);
app.use(warehousesRoutes);
app.use(inventoryRoutes);
app.use(movementsRoutes);
app.use(ordersRoutes);
app.use(salesCategoriesRoutes);
app.use(moneyMovementsRoutes);
app.use('/platform/auth', platformAuthRoutes);
app.use('/platform/admin', platformAdminRoutes);
app.use('/platform/companies', platformCompaniesRoutes);
app.use('/platform/dashboard', platformDashboardRoutes);
app.use('/platform/audit', platformAuditRoutes);
app.use('/platform/settings', platformSettingsRoutes);

// ⛔ siempre al final
app.use(errorHandler);

export default app;
