import { Router } from 'express';
import { authenticate, requireCompany } from '../middleware/auth.middleware.js';
import { getDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     summary: Estadísticas agregadas (albaranes por mes, horas por proyecto, materiales por cliente)
 *     tags: [Dashboard]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200: { description: Estadísticas agregadas }
 */
router.get('/', authenticate, requireCompany, getDashboard);

export default router;
