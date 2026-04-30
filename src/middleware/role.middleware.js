import { AppError } from '../utils/AppError.js';

export const authorize = (...roles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Se requiere uno de los siguientes roles: ${roles.join(', ')}`)
      );
    }
    next();
  };
