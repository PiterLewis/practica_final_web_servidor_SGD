import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/index.js';
import { dbStatus } from './config/database.js';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { sanitize } from './middleware/sanitize.js';
import { setupSwagger } from './docs/swagger.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: config.cors.origin }));

if (!config.isTest) {
  app.use(apiLimiter);
}

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(sanitize);

app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

setupSwagger(app);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Estado del servicio (servidor y base de datos)
 *     tags: [Sistema]
 *     security: []
 *     responses:
 *       200:
 *         description: Estado del servicio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 db: { type: string, example: connected }
 *                 uptime: { type: number }
 *                 timestamp: { type: string, format: date-time }
 */
app.get('/health', (_req, res) => {
  const db = dbStatus();
  const status = db === 'connected' ? 'ok' : 'degraded';
  res.json({
    status,
    db,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.use('/api', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: true, message: 'Ruta no encontrada', code: 'NOT_FOUND' });
});

app.use(errorHandler);

export default app;
