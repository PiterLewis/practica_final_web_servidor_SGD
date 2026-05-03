import http from 'node:http';
import { config } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import app from './app.js';
import { initSocket, closeSocket } from './sockets/index.js';

let server;
let shuttingDown = false;

const start = async () => {
  try {
    await connectDatabase();
    console.log('[db] Conectado a MongoDB');

    server = http.createServer(app);
    initSocket(server);

    server.listen(config.port, () => {
      console.log(`[server] Escuchando en http://localhost:${config.port}`);
      console.log(`[docs]   Swagger UI en http://localhost:${config.port}/api-docs`);
    });
  } catch (err) {
    console.error('[server] Error al iniciar:', err.message);
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] Recibida señal ${signal}, cerrando ordenadamente`);

  const timer = setTimeout(() => {
    console.error('[server] Timeout de apagado superado, forzando salida');
    process.exit(1);
  }, config.shutdown.timeoutMs);

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log('[server] HTTP cerrado');
    }
    await closeSocket();
    console.log('[server] Socket.IO cerrado');
    await disconnectDatabase();
    console.log('[db] MongoDB desconectado');
    clearTimeout(timer);
    process.exit(0);
  } catch (err) {
    console.error('[server] Error durante el apagado:', err);
    clearTimeout(timer);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => {
  console.error('[server] unhandledRejection:', err);
});

start();
