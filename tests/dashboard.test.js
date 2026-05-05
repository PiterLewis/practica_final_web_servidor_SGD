import request from 'supertest';
import app from '../src/app.js';
import {
  connectDb,
  disconnectDb,
  clearDb,
  setupAdminWithCompany,
  createSampleClient,
  createSampleProject,
} from './helpers.js';

beforeAll(connectDb);
afterAll(disconnectDb);
afterEach(clearDb);

describe('GET /api/dashboard', () => {
  it('agrega albaranes por mes, horas por proyecto y materiales por cliente', async () => {
    const admin = await setupAdminWithCompany(app);
    const client = await createSampleClient(app, admin.accessToken);
    const project = await createSampleProject(app, admin.accessToken, client._id);

    await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 8,
      })
      .expect(201);

    await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        workers: [
          { name: 'A', hours: 2 },
          { name: 'B', hours: 4 },
        ],
      })
      .expect(201);

    await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'material',
        material: 'Cemento',
        quantity: 5,
        unit: 'sacos',
      })
      .expect(201);

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.byMonth)).toBe(true);
    expect(res.body.byMonth.length).toBeGreaterThan(0);
    expect(res.body.byMonth[0].total).toBe(3);

    expect(res.body.hoursByProject).toHaveLength(1);
    expect(res.body.hoursByProject[0].totalHours).toBe(14);

    expect(res.body.materialsByClient).toHaveLength(1);
    expect(res.body.materialsByClient[0].totalQuantity).toBe(5);
    expect(res.body.materialsByClient[0].material).toBe('Cemento');
  });

  it('devuelve estructura vacía si no hay albaranes', async () => {
    const admin = await setupAdminWithCompany(app);
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(res.body.byMonth).toEqual([]);
    expect(res.body.hoursByProject).toEqual([]);
    expect(res.body.materialsByClient).toEqual([]);
  });
});

describe('Auth edge cases', () => {
  it('rechaza token con formato inválido (401)', async () => {
    await request(app)
      .get('/api/user')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .expect(401);
  });

  it('rechaza Authorization sin Bearer (401)', async () => {
    await request(app)
      .get('/api/user')
      .set('Authorization', 'Basic foo')
      .expect(401);
  });
});
