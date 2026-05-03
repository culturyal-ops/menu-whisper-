import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Routes
import whatsappWebhookRouter from './webhook/whatsapp';
import authRouter from './routes/auth';
import restaurantRouter from './routes/restaurant';
import ordersRouter from './routes/orders';
import analyticsRouter from './routes/analytics';
import settingsRouter from './routes/settings';
import paymentWebhookRouter from './automation/paymentWebhook';
import internalRouter from './routes/internal';

// Automation
import { healthCheck, readinessCheck, livenessCheck } from './automation/healthCheck';
import { startAllCronJobs } from './automation/cronJobs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Raw body for webhook signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// JSON parsing for other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(createRateLimiter());

// Health checks (for monitoring & orchestration)
app.get('/health', healthCheck);
app.get('/health/ready', readinessCheck);
app.get('/health/live', livenessCheck);

// Routes
app.use('/webhook', whatsappWebhookRouter);
app.use('/webhook/payment', paymentWebhookRouter);
app.use('/api/auth', authRouter);
app.use('/api/restaurant', restaurantRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/internal', internalRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Menu Whisper Backend running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  
  // Start automated cron jobs
  if (process.env.ENABLE_CRON_JOBS !== 'false') {
    startAllCronJobs();
    logger.info('Cron jobs started');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
