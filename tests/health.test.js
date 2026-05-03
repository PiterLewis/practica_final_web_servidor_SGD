import request from 'supertest';
import app from '../src/app.js';
import { connectDb, disconnectDb } from './helpers.js';

beforeAll(connectDb);
afterAll(disconnectDb);

describe('GET /health', () => {
  it('devuelve estado del servidor y de la base de datos', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBeDefined();
    expect(res.body.db).toBe('connected');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('404', () => {
  it('devuelve 404 en una ruta inexistente', async () => {
    const res = await request(app).get('/no-existe').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
