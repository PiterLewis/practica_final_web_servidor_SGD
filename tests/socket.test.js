import http from 'node:http';
import { io as Client } from 'socket.io-client';
import request from 'supertest';
import app from '../src/app.js';
import { initSocket, closeSocket } from '../src/sockets/index.js';
import {
  connectDb,
  disconnectDb,
  clearDb,
  setupAdminWithCompany,
  createSampleClient,
} from './helpers.js';

let server;
let port;

beforeAll(async () => {
  await connectDb();
  server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

afterAll(async () => {
  await closeSocket();
  await new Promise((resolve) => server.close(resolve));
  await disconnectDb();
});

afterEach(clearDb);

describe('Socket.IO', () => {
  it('rechaza conexiones sin token', async () => {
    const socket = Client(`http://localhost:${port}`, { reconnection: false });
    const error = await new Promise((resolve) => {
      socket.on('connect_error', (err) => resolve(err));
    });
    expect(error.message).toMatch(/token/i);
    socket.close();
  });

  it('emite client:new a la room de la compañía', async () => {
    const admin = await setupAdminWithCompany(app);
    const socket = Client(`http://localhost:${port}`, {
      auth: { token: admin.accessToken },
      reconnection: false,
    });
    await new Promise((resolve, reject) => {
      socket.on('connected', resolve);
      socket.on('connect_error', reject);
    });

    const eventPromise = new Promise((resolve) => socket.on('client:new', resolve));
    await createSampleClient(app, admin.accessToken);
    const payload = await eventPromise;

    expect(payload.id).toBeDefined();
    expect(payload.name).toBeDefined();
    socket.close();
  });
});
