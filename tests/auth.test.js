import request from 'supertest';
import app from '../src/app.js';
import { connectDb, disconnectDb, clearDb, registerUser, verifyUser } from './helpers.js';

beforeAll(connectDb);
afterAll(disconnectDb);
afterEach(clearDb);

describe('POST /api/user/register', () => {
  it('crea un usuario y devuelve tokens', async () => {
    const res = await request(app)
      .post('/api/user/register')
      .send({ email: 'nuevo@test.com', password: 'Password123' })
      .expect(201);
    expect(res.body.user.email).toBe('nuevo@test.com');
    expect(res.body.user.status).toBe('pending');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('rechaza email no válido (400)', async () => {
    await request(app)
      .post('/api/user/register')
      .send({ email: 'noemail', password: 'Password123' })
      .expect(400);
  });

  it('rechaza contraseña sin complejidad (400)', async () => {
    await request(app)
      .post('/api/user/register')
      .send({ email: 'a@b.com', password: 'pass' })
      .expect(400);
  });

  it('rechaza email ya verificado (409)', async () => {
    const reg = await registerUser(app);
    const User = (await import('../src/models/User.js')).default;
    await User.findOneAndUpdate({ email: reg.email }, { status: 'verified' });
    await request(app)
      .post('/api/user/register')
      .send({ email: reg.email, password: 'Password123' })
      .expect(409);
  });
});

describe('PUT /api/user/validation', () => {
  it('rechaza código incorrecto y consume intentos', async () => {
    const reg = await registerUser(app);
    const res = await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ code: '000000' })
      .expect(400);
    expect(res.body.error).toBe(true);
  });

  it('verifica el email con código correcto', async () => {
    const reg = await registerUser(app);
    const User = (await import('../src/models/User.js')).default;
    const dbUser = await User.findOne({ email: reg.email });
    await request(app)
      .put('/api/user/validation')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ code: dbUser.verificationCode })
      .expect(200);
  });

  it('rechaza acceso sin token (401)', async () => {
    await request(app).put('/api/user/validation').send({ code: '123456' }).expect(401);
  });
});

describe('POST /api/user/login', () => {
  it('inicia sesión con credenciales correctas', async () => {
    const reg = await registerUser(app);
    const res = await request(app)
      .post('/api/user/login')
      .send({ email: reg.email, password: reg.password })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('rechaza contraseña incorrecta (401)', async () => {
    const reg = await registerUser(app);
    await request(app)
      .post('/api/user/login')
      .send({ email: reg.email, password: 'OtraPwd123' })
      .expect(401);
  });
});

describe('GET /api/user', () => {
  it('devuelve el usuario autenticado', async () => {
    const reg = await registerUser(app);
    const res = await request(app)
      .get('/api/user')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .expect(200);
    expect(res.body.user.email).toBe(reg.email);
  });
});

describe('PUT /api/user/password', () => {
  it('aplica refine: rechaza nueva contraseña igual a la actual', async () => {
    const reg = await registerUser(app);
    await request(app)
      .put('/api/user/password')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ currentPassword: reg.password, newPassword: reg.password })
      .expect(400);
  });

  it('cambia la contraseña correctamente', async () => {
    const reg = await registerUser(app);
    await request(app)
      .put('/api/user/password')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .send({ currentPassword: reg.password, newPassword: 'NuevaPwd456' })
      .expect(200);
  });
});

describe('Sesión: refresh + logout', () => {
  it('renueva el access token con el refresh', async () => {
    const reg = await registerUser(app);
    const res = await request(app)
      .post('/api/user/refresh')
      .send({ refreshToken: reg.refreshToken })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('al hacer logout invalida el refresh', async () => {
    const reg = await registerUser(app);
    await request(app)
      .post('/api/user/logout')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .expect(200);
    await request(app)
      .post('/api/user/refresh')
      .send({ refreshToken: reg.refreshToken })
      .expect(401);
  });
});

describe('DELETE /api/user', () => {
  it('soft delete de usuario', async () => {
    const reg = await registerUser(app);
    const res = await request(app)
      .delete('/api/user?soft=true')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .expect(200);
    expect(res.body.message).toMatch(/soft/i);
  });

  it('hard delete de usuario', async () => {
    const reg = await registerUser(app);
    await request(app)
      .delete('/api/user')
      .set('Authorization', `Bearer ${reg.accessToken}`)
      .expect(200);
  });
});
