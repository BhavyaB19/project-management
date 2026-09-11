import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { NotFoundError } from './utils/errors.js';

const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);

// 404 Handler
app.use((_req, _res, next) => {
  next(new NotFoundError('The requested route does not exist'));
});

// Global Error Handler
app.use(errorHandler);

export default app;