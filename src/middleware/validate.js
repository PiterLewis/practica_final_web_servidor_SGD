import { AppError } from '../utils/AppError.js';

export const validate = (schema, target = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[target]);
  if (!result.success) {
    const details = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return next(AppError.badRequest('Datos de entrada no válidos', 'VALIDATION_ERROR', details));
  }
  if (target === 'query') {
    // req.query es read-only en Express 5; copiamos los valores parseados
    Object.keys(req.query).forEach((k) => delete req.query[k]);
    Object.assign(req.query, result.data);
  } else {
    req[target] = result.data;
  }
  next();
};
