import request from 'supertest';
import app from '../src/app.js';
import {
  connectDb,
  disconnectDb,
  clearDb,
  setupAdminWithCompany,
  registerUser,
} from './helpers.js';

beforeAll(connectDb);
afterAll(disconnectDb);
afterEach(clearDb);

describe('POST /api/client', () => {
  it('crea un cliente para la compañía del usuario', async () => {
    const admin = await setupAdminWithCompany(app);
    const res = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Acme', cif: 'A11111111' })
      .expect(201);
    expect(res.body.client.name).toBe('Acme');
    expect(res.body.client.company).toBeDefined();
  });

  it('rechaza si el usuario no tiene compañía (400)', async () => {
    const reg = await registerUser(app);
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ name: 'Acme', cif: 'B0' })
      .expect(400);
  });

  it('rechaza CIF duplicado dentro de la compañía (409)', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Acme', cif: 'A22222222' })
      .expect(201);
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Acme 2', cif: 'A22222222' })
      .expect(409);
  });

  it('rechaza datos inválidos (400)', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ cif: 'A33333333' })
      .expect(400);
  });
});

describe('GET /api/client', () => {
  it('lista paginado y filtrado por nombre', async () => {
    const admin = await setupAdminWithCompany(app);
    for (const n of ['Alfa', 'Beta', 'Gamma', 'Alfa Bis']) {
      await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ name: n, cif: `X${Math.random().toString().slice(2, 10)}` })
        .expect(201);
    }
    const res = await request(app)
      .get('/api/client?name=Alfa&page=1&limit=5')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(res.body.totalItems).toBe(2);
    expect(res.body.currentPage).toBe(1);
    expect(res.body.totalPages).toBe(1);
    expect(res.body.items).toHaveLength(2);
  });

  it('un usuario no ve los clientes de otra compañía', async () => {
    const a = await setupAdminWithCompany(app, { cif: 'EMP-A' });
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ name: 'Solo A', cif: 'CA1' })
      .expect(201);

    const b = await setupAdminWithCompany(app, { cif: 'EMP-B' });
    const res = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);
    expect(res.body.totalItems).toBe(0);
  });
});

describe('GET / PUT / DELETE /api/client/:id', () => {
  it('actualiza un cliente', async () => {
    const admin = await setupAdminWithCompany(app);
    const created = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Inicio', cif: 'U1' })
      .expect(201);

    const res = await request(app)
      .put(`/api/client/${created.body.client._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Actualizado' })
      .expect(200);
    expect(res.body.client.name).toBe('Actualizado');
  });

  it('soft delete + listar archivados + restore', async () => {
    const admin = await setupAdminWithCompany(app);
    const created = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Borrame', cif: 'D1' })
      .expect(201);

    await request(app)
      .delete(`/api/client/${created.body.client._id}?soft=true`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const archived = await request(app)
      .get('/api/client/archived')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(archived.body.totalItems).toBe(1);

    await request(app)
      .patch(`/api/client/${created.body.client._id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const archivedAfter = await request(app)
      .get('/api/client/archived')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(archivedAfter.body.totalItems).toBe(0);

    const list = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(list.body.totalItems).toBe(1);
  });

  it('hard delete elimina del listado', async () => {
    const admin = await setupAdminWithCompany(app);
    const created = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Hard', cif: 'H1' })
      .expect(201);

    await request(app)
      .delete(`/api/client/${created.body.client._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const list = await request(app)
      .get('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(list.body.totalItems).toBe(0);
  });

  it('rechaza restaurar si ya existe un cliente activo con ese CIF (409)', async () => {
    const admin = await setupAdminWithCompany(app);
    const a = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Original', cif: 'CONF-1' })
      .expect(201);

    await request(app)
      .delete(`/api/client/${a.body.client._id}?soft=true`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Nuevo', cif: 'CONF-1' })
      .expect(201);

    await request(app)
      .patch(`/api/client/${a.body.client._id}/restore`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(409);
  });

  it('devuelve 404 al obtener un cliente inexistente', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .get('/api/client/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);
  });

  it('rechaza id mal formado (400)', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .get('/api/client/no-es-objectid')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(400);
  });

  it('update devuelve 404 si el cliente no existe', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .put('/api/client/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'Cualquiera' })
      .expect(404);
  });

  it('update rechaza CIF duplicado de otro cliente (409)', async () => {
    const admin = await setupAdminWithCompany(app);
    const a = await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'A', cif: 'CIF-A' })
      .expect(201);
    await request(app)
      .post('/api/client')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ name: 'B', cif: 'CIF-B' })
      .expect(201);

    await request(app)
      .put(`/api/client/${a.body.client._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ cif: 'CIF-B' })
      .expect(409);
  });

  it('delete devuelve 404 si no existe; list con filtro cif y sort funciona', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .delete('/api/client/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);

    for (const cif of ['ABC-1', 'ABC-2', 'XYZ-1']) {
      await request(app)
        .post('/api/client')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({ name: `Cli ${cif}`, cif })
        .expect(201);
    }
    const res = await request(app)
      .get('/api/client?cif=ABC&sort=-name')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(res.body.totalItems).toBe(2);
    expect(res.body.items[0].name).toBe('Cli ABC-2');
  });
});
