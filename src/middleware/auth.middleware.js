import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';
import User from '../models/User.js';

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(AppError.unauthorized('Token no proporcionado'));
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, config.jwt.secret);

    const user = await User.findById(payload.id);
    if (!user) {
      return next(AppError.unauthorized('Token no válido'));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Token expirado', 'TOKEN_EXPIRED'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('Token inválido', 'TOKEN_INVALID'));
    }
    next(err);
  }
};

// Exige que el usuario tenga compañía asignada (necesario para clientes/proyectos/albaranes)
export const requireCompany = (req, _res, next) => {
  if (!req.user?.company) {
    return next(AppError.badRequest('El usuario no tiene compañía asociada', 'NO_COMPANY'));
  }
  next();
};
