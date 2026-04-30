import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import { reportServerError } from '../services/slack.service.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  // Error de clave duplicada de Mongo
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'campo';
    err = AppError.conflict(`Ya existe un registro con ese ${field}`, 'DUPLICATE_KEY');
  }

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    err = AppError.badRequest('Error de validación de Mongoose', 'VALIDATION_ERROR', details);
  }

  // CastError (ObjectId mal formado)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    err = AppError.badRequest(`Identificador no válido: ${err.value}`, 'INVALID_ID');
  }

  // Errores de Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    err = AppError.badRequest('El archivo supera el tamaño máximo permitido', 'FILE_TOO_LARGE');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    err = AppError.badRequest('Campo de archivo inesperado', 'UNEXPECTED_FILE');
  }

  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Error interno del servidor';

  const body = { error: true, message, code };
  if (err.details) body.details = err.details;

  if (config.nodeEnv !== 'production' && !err.isOperational) {
    body.stack = err.stack;
  }

  // Errores 5XX a Slack
  if (statusCode >= 500) {
    if (config.nodeEnv !== 'test') {
      console.error('[error]', req.method, req.originalUrl, '-', err.stack ?? err.message);
    }
    reportServerError({
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      stack: err.stack,
      statusCode,
    }).catch(() => {});
  }

  res.status(statusCode).json(body);
};
