import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import cors from 'cors';

import errorHandler from './middlewares/errorHandler.js';
import usersRoutes from './modules/users/users.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
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
import movementsRoutes from './modules/stock-movements/stock-movements.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import salesCategoriesRoutes from './modules/sales-categories/sales-categories.routes.js';
import moneyMovementsRoutes from './modules/money-movements/money-movements.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/users', usersRoutes);
app.use('/auth', authRoutes);
app.use('/stock', stockRoutes);          // Antes: app.use(stockRoutes);
app.use('/company', companyRoutes);      // Antes: app.use(companyRoutes);
app.use('/products', productsRoutes);    // etc...
app.use('/warehouses', warehousesRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/movements', movementsRoutes);
app.use('/orders', ordersRoutes);
app.use('/sales', salesRoutes);
app.use('/sales-categories', salesCategoriesRoutes);
app.use('/money-movements', moneyMovementsRoutes);
app.use('/platform/admin', platformAdminRoutes);
app.use('/platform/companies', platformCompaniesRoutes);
app.use('/platform/dashboard', platformDashboardRoutes);
app.use('/platform/audit', platformAuditRoutes);
app.use('/platform/settings', platformSettingsRoutes);

// ⛔ siempre al final
app.use(errorHandler);

export default app;
