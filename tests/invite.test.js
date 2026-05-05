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

describe('POST /api/user/invite', () => {
  it('un admin invita a un guest y la cuenta queda creada', async () => {
    const admin = await setupAdminWithCompany(app);
    const res = await request(app)
      .post('/api/user/invite')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'invitado@test.com', name: 'Pepa', lastName: 'Invitada' })
      .expect(201);
    expect(res.body.user.role).toBe('guest');
    expect(res.body.tempPassword).toBeDefined();
  });

  it('un guest no puede invitar (403, ejercita role middleware)', async () => {
    const adminA = await setupAdminWithCompany(app, { cif: 'EMP-INV-A' });

    const guest = await registerUser(app);
    const User = (await import('../src/models/User.js')).default;
    const dbGuest = await User.findOne({ email: guest.email });
    await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .send({ code: dbGuest.verificationCode })
      .expect(200);

    await request(app)
      .put('/api/user/register')
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .send({ name: 'Guest', lastName: 'User', nif: 'G123' })
      .expect(200);

    await request(app)
      .patch('/api/user/company')
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .send({ isFreelance: false, name: 'Empresa Test SL', cif: 'EMP-INV-A' })
      .expect(200);

    await request(app)
      .post('/api/user/invite')
      .set('Authorization', `Bearer ${guest.accessToken}`)
      .send({ email: 'rechazado@test.com' })
      .expect(403);
  });

  it('rechaza si el admin no tiene compañía (400)', async () => {
    const reg = await registerUser(app);
    await request(app)
      .post('/api/user/invite')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ email: 'no-comp@test.com' })
      .expect(400);
  });

  it('rechaza email duplicado (409)', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .post('/api/user/invite')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'repetido@test.com' })
      .expect(201);
    await request(app)
      .post('/api/user/invite')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'repetido@test.com' })
      .expect(409);
  });
});

describe('PATCH /api/user/company (autonomo)', () => {
  it('crea una compañía como freelance usando el NIF', async () => {
    const reg = await registerUser(app);
    await request(app)
      .put('/api/user/register')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ name: 'Free', lastName: 'Lance', nif: 'NIF-FREE-1' })
      .expect(200);
    const res = await request(app)
      .patch('/api/user/company')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ isFreelance: true })
      .expect(200);
    expect(res.body.company.isFreelance).toBe(true);
    expect(res.body.company.cif).toBe('NIF-FREE-1');
  });

  it('rechaza freelance sin NIF previo (400)', async () => {
    const reg = await registerUser(app);
    await request(app)
      .patch('/api/user/company')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ isFreelance: true })
      .expect(400);
  });
});

describe('PATCH /api/user/logo', () => {
  it('sube el logo y devuelve la URL', async () => {
    const admin = await setupAdminWithCompany(app);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    const res = await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .attach('logo', png, { filename: 'logo.png', contentType: 'image/png' })
      .expect(200);
    expect(res.body.logo).toMatch(/logo/);
  });

  it('rechaza si no se envía archivo (400)', async () => {
    const admin = await setupAdminWithCompany(app);
    await request(app)
      .patch('/api/user/logo')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(400);
  });
});
