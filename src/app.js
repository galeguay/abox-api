import 'dotenv/config';
import 'express-async-errors';

import express from 'express';
import cors from 'cors';

import errorHandler from './middlewares/errorHandler.js';
import usersRoutes from './modules/users/users.routes.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/users', usersRoutes);
app.use('/auth', authRoutes);

// ⛔ siempre al final
app.use(errorHandler);

export default app;
