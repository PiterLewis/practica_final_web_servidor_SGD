export class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'No autorizado', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Acceso denegado', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(message = 'Recurso no encontrado', code = 'NOT_FOUND') {
    return new AppError(message, 404, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  static unprocessable(message, code = 'UNPROCESSABLE_ENTITY', details = null) {
    return new AppError(message, 422, code, details);
  }

  static tooManyRequests(message = 'Demasiadas peticiones', code = 'TOO_MANY_REQUESTS') {
    return new AppError(message, 429, code);
  }

  static internal(message = 'Error interno del servidor', code = 'INTERNAL_ERROR') {
    return new AppError(message, 500, code);
  }
}
