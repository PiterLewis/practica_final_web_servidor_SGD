import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import User from '../models/User.js';

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: config.cors.origin },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ??
        (socket.handshake.headers?.authorization?.startsWith('Bearer ')
          ? socket.handshake.headers.authorization.slice('Bearer '.length).trim()
          : null);

      if (!token) return next(new Error('Token no proporcionado'));

      const payload = jwt.verify(token, config.jwt.secret);
      const user = await User.findById(payload.id).select('email role company');
      if (!user) return next(new Error('Usuario no encontrado'));
      if (!user.company) return next(new Error('El usuario no tiene compañía asociada'));

      socket.data.userId = user._id.toString();
      socket.data.email = user.email;
      socket.data.companyId = user.company.toString();
      next();
    } catch (err) {
      next(new Error(err.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const room = `company:${socket.data.companyId}`;
    socket.join(room);
    if (!config.isTest) {
      console.log(`[socket] ${socket.data.email} conectado en ${room}`);
    }
    socket.emit('connected', { room });

    socket.on('disconnect', () => {
      if (!config.isTest) {
        console.log(`[socket] ${socket.data.email} desconectado`);
      }
    });
  });

  return io;
};

export const getIo = () => io;

export const emitToCompany = (companyId, event, payload) => {
  if (!io || !companyId) return;
  io.to(`company:${companyId.toString()}`).emit(event, payload);
};

export const closeSocket = async () => {
  if (!io) return;
  await new Promise((resolve) => io.close(resolve));
  io = null;
};
