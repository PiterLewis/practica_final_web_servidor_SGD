import request from 'supertest';
import app from '../src/app.js';
import {
  connectDb,
  disconnectDb,
  clearDb,
  setupAdminWithCompany,
  createSampleClient,
} from './helpers.js';

beforeAll(connectDb);
afterAll(disconnectDb);
afterEach(clearDb);

describe('POST /api/project', () => {
  it('crea un proyecto vinculado a un cliente', async () => {
    const admin = await setupAdminWithCompany(app);
    const client = await createSampleClient(app, admin.accessToken);
    const res = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Reforma', projectCode: 'PRJ-001', client: client._id })
      .expect(201);
    expect(res.body.project.projectCode).toBe('PRJ-001');
  });

  it('rechaza si el cliente no es de la compañía (404)', async () => {
    const a = await setupAdminWithCompany(app, { cif: 'EMP-X' });
    const clientA = await createSampleClient(app, a.accessToken);

    const b = await setupAdminWithCompany(app, { cif: 'EMP-Y' });
    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ name: 'Otro', projectCode: 'PRJ-002', client: clientA._id })
      .expect(404);
  });

  it('rechaza projectCode duplicado en la misma compañía (409)', async () => {
    const admin = await setupAdminWithCompany(app);
    const client = await createSampleClient(app, admin.accessToken);
    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Uno', projectCode: 'DUP-1', client: client._id })
      .expect(201);
    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Dos', projectCode: 'DUP-1', client: client._id })
      .expect(409);
  });
});

describe('GET /api/project', () => {
  it('filtra por cliente y por nombre', async () => {
    const admin = await setupAdminWithCompany(app);
    const c1 = await createSampleClient(app, admin.accessToken);
    const c2 = await createSampleClient(app, admin.accessToken);

    for (const [name, code, client] of [
      ['Alfa', 'PA1', c1._id],
      ['Beta', 'PB1', c1._id],
      ['Alfa Bis', 'PA2', c2._id],
    ]) {
      await request(app)
        .post('/api/project')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ name, projectCode: code, client })
        .expect(201);
    }

    const byClient = await request(app)
      .get(`/api/project?client=${c1._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(byClient.body.totalItems).toBe(2);

    const byName = await request(app)
      .get('/api/project?name=Alfa')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(byName.body.totalItems).toBe(2);
  });
});

describe('archivar y restaurar proyectos', () => {
  it('soft delete + restore', async () => {
    const admin = await setupAdminWithCompany(app);
    const client = await createSampleClient(app, admin.accessToken);
    const project = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Prueba', projectCode: 'PRJ-X', client: client._id })
      .expect(201);

    await request(app)
      .delete(`/api/project/${project.body.project._id}?soft=true`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const arch = await request(app)
      .get('/api/project/archived')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(arch.body.totalItems).toBe(1);

    await request(app)
      .patch(`/api/project/${project.body.project._id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });

  it('rechaza restaurar si ya hay un proyecto activo con ese código (409)', async () => {
    const admin = await setupAdminWithCompany(app);
    const client = await createSampleClient(app, admin.accessToken);

    const orig = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Original', projectCode: 'CODE-1', client: client._id })
      .expect(201);

    await request(app)
      .delete(`/api/project/${orig.body.project._id}?soft=true`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Nuevo', projectCode: 'CODE-1', client: client._id })
      .expect(201);

    await request(app)
      .patch(`/api/project/${orig.body.project._id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(409);
  });
});

describe('errores 404 en proyectos', () => {
  it('get / update / delete devuelven 404 si el proyecto no existe', async () => {
    const admin = await setupAdminWithCompany(app);
    const fakeId = '507f1f77bcf86cd799439011';

    await request(app)
      .get(`/api/project/${fakeId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);

    await request(app)
      .put(`/api/project/${fakeId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'X' })
      .expect(404);

    await request(app)
      .delete(`/api/project/${fakeId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);
  });

  it('update rechaza projectCode duplicado de otro proyecto y filtra por active', async () => {
    const admin = await setupAdminWithCompany(app);
    const client = await createSampleClient(app, admin.accessToken);
    const a = await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'A', projectCode: 'AA-1', client: client._id, active: true })
      .expect(201);
    await request(app)
      .post('/api/project')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'B', projectCode: 'BB-1', client: client._id, active: false })
      .expect(201);

    await request(app)
      .put(`/api/project/${a.body.project._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ projectCode: 'BB-1' })
      .expect(409);

    const filtered = await request(app)
      .get('/api/project?active=false&sort=name')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(filtered.body.totalItems).toBe(1);
    expect(filtered.body.items[0].name).toBe('B');
  });
});
