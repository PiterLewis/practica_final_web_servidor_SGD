import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: 'Demasiadas peticiones, intenta más tarde',
    code: 'RATE_LIMIT',
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: true,
    message: 'Demasiados intentos de autenticación',
    code: 'AUTH_RATE_LIMIT',
  },
});
