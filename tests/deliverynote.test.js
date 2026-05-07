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

const seed = async () => {
  const admin = await setupAdminWithCompany(app);
  const client = await createSampleClient(app, admin.accessToken);
  const project = await createSampleProject(app, admin.accessToken, client._id);
  return { admin, client, project };
};

describe('POST /api/deliverynote', () => {
  it('crea un albarán de horas con varios trabajadores', async () => {
    const { admin, client, project } = await seed();
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        description: 'Trabajo en obra',
        workers: [
          { name: 'Pedro', hours: 4 },
          { name: 'Ana', hours: 3 },
        ],
      })
      .expect(201);
    expect(res.body.deliveryNote.format).toBe('hours');
    expect(res.body.deliveryNote.workers).toHaveLength(2);
  });

  it('crea un albarán de material', async () => {
    const { admin, client, project } = await seed();
    const res = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'material',
        material: 'Cemento',
        quantity: 10,
        unit: 'sacos',
      })
      .expect(201);
    expect(res.body.deliveryNote.material).toBe('Cemento');
  });

  it('rechaza horas sin total ni trabajadores (400)', async () => {
    const { admin, client, project } = await seed();
    await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
      })
      .expect(400);
  });

  it('rechaza si cliente y proyecto no coinciden (400)', async () => {
    const { admin, project } = await seed();
    const otroCliente = await createSampleClient(app, admin.accessToken);
    await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: otroCliente._id,
        project: project._id,
        format: 'hours',
        hours: 5,
      })
      .expect(400);
  });
});

describe('GET /api/deliverynote (filtros y paginación)', () => {
  it('filtra por proyecto y formato', async () => {
    const { admin, client, project } = await seed();
    const otroProject = await createSampleProject(app, admin.accessToken, client._id);

    const make = (project, format, body = {}) =>
      request(app)
        .post('/api/deliverynote')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .send({
          client: client._id,
          project,
          format,
          ...(format === 'hours' ? { hours: 8 } : { material: 'Pintura', quantity: 2 }),
          ...body,
        })
        .expect(201);

    await make(project._id, 'hours');
    await make(project._id, 'material');
    await make(otroProject._id, 'hours');

    const byProject = await request(app)
      .get(`/api/deliverynote?project=${project._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(byProject.body.totalItems).toBe(2);

    const byFormat = await request(app)
      .get('/api/deliverynote?format=material')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(byFormat.body.totalItems).toBe(1);
  });
});

describe('GET /api/deliverynote/:id', () => {
  it('devuelve el albarán con populate de cliente y proyecto', async () => {
    const { admin, client, project } = await seed();
    const created = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 5,
      })
      .expect(201);

    const res = await request(app)
      .get(`/api/deliverynote/${created.body.deliveryNote._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(res.body.deliveryNote.client.name).toBeDefined();
    expect(res.body.deliveryNote.project.name).toBeDefined();
    expect(res.body.deliveryNote.user.email).toBeDefined();
  });
});

describe('GET /api/deliverynote (filtros signed y rango de fechas)', () => {
  it('filtra por signed y por rango from/to', async () => {
    const { admin, client, project } = await seed();
    const a = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 4,
        workDate: '2025-01-15',
      })
      .expect(201);
    await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 5,
        workDate: '2025-06-15',
      })
      .expect(201);

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    await request(app)
      .patch(`/api/deliverynote/${a.body.deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('signature', png, { filename: 'firma.png', contentType: 'image/png' })
      .expect(200);

    const signed = await request(app)
      .get('/api/deliverynote?signed=true')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(signed.body.totalItems).toBe(1);

    const range = await request(app)
      .get('/api/deliverynote?from=2025-01-01&to=2025-03-01')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(range.body.totalItems).toBe(1);
  });
});

describe('GET /api/deliverynote/pdf/:id', () => {
  it('devuelve un PDF binario', async () => {
    const { admin, client, project } = await seed();
    const created = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'material',
        material: 'Arena',
        quantity: 1,
        unit: 't',
      })
      .expect(201);

    const res = await request(app)
      .get(`/api/deliverynote/pdf/${created.body.deliveryNote._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(100);
  });

  it('un guest no creador recibe 403 y el creador recibe 200', async () => {
    const { admin, client, project } = await seed();

    // El admin crea el albarán: él es el creador
    const created = await request(app)
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
    const noteId = created.body.deliveryNote._id;

    // El admin invita a un guest a su misma compañía
    const invited = await request(app)
      .post('/api/user/invite')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'guest_pdf@test.com', name: 'Guest', lastName: 'PDF' })
      .expect(201);

    // El guest hace login con la contraseña temporal del invite
    const guestLogin = await request(app)
      .post('/api/user/login')
      .send({ email: 'guest_pdf@test.com', password: invited.body.tempPassword })
      .expect(200);
    const guestToken = guestLogin.body.accessToken;

    // El guest no es el creador, debe recibir 403
    const denied = await request(app)
      .get(`/api/deliverynote/pdf/${noteId}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .expect(403);
    expect(denied.body.code).toBe('FORBIDDEN_PDF');

    // El creador sí puede descargarlo
    const ok = await request(app)
      .get(`/api/deliverynote/pdf/${noteId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    expect(ok.headers['content-type']).toMatch(/application\/pdf/);
    expect(ok.body).toBeInstanceOf(Buffer);
    expect(ok.body.length).toBeGreaterThan(100);
  });
});

describe('PATCH /api/deliverynote/:id/sign', () => {
  it('firma un albarán y guarda la URL de la firma', async () => {
    const { admin, client, project } = await seed();
    const created = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 6,
      })
      .expect(201);

    // 1x1 PNG transparente
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    const res = await request(app)
      .patch(`/api/deliverynote/${created.body.deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('signature', png, { filename: 'firma.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.deliveryNote.signed).toBe(true);
    expect(res.body.deliveryNote.signatureUrl).toBeDefined();
  });

  it('rechaza firmar sin imagen (400)', async () => {
    const { admin, client, project } = await seed();
    const created = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 6,
      })
      .expect(201);
    await request(app)
      .patch(`/api/deliverynote/${created.body.deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(400);
  });

  it('devuelve 404 al firmar un albarán inexistente', async () => {
    const { admin } = await seed();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    await request(app)
      .patch('/api/deliverynote/507f1f77bcf86cd799439011/sign')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('signature', png, { filename: 'firma.png', contentType: 'image/png' })
      .expect(404);
  });

  it('no permite firmar dos veces (409)', async () => {
    const { admin, client, project } = await seed();
    const created = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 6,
      })
      .expect(201);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    await request(app)
      .patch(`/api/deliverynote/${created.body.deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('signature', png, { filename: 'firma.png', contentType: 'image/png' })
      .expect(200);
    await request(app)
      .patch(`/api/deliverynote/${created.body.deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('signature', png, { filename: 'firma.png', contentType: 'image/png' })
      .expect(409);
  });
});

describe('DELETE /api/deliverynote/:id', () => {
  it('borra un albarán no firmado', async () => {
    const { admin, client, project } = await seed();
    const created = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 4,
      })
      .expect(201);
    await request(app)
      .delete(`/api/deliverynote/${created.body.deliveryNote._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
  });

  it('devuelve 404 al borrar un albarán inexistente', async () => {
    const { admin } = await seed();
    await request(app)
      .delete('/api/deliverynote/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);
  });

  it('no permite borrar un albarán firmado (403)', async () => {
    const { admin, client, project } = await seed();
    const created = await request(app)
      .post('/api/deliverynote')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        client: client._id,
        project: project._id,
        format: 'hours',
        hours: 4,
      })
      .expect(201);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    await request(app)
      .patch(`/api/deliverynote/${created.body.deliveryNote._id}/sign`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('signature', png, { filename: 'firma.png', contentType: 'image/png' })
      .expect(200);

    await request(app)
      .delete(`/api/deliverynote/${created.body.deliveryNote._id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(403);
  });
});
