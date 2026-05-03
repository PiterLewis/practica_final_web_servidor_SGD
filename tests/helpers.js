import mongoose from 'mongoose';
import request from 'supertest';

export const connectDb = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
};

export const disconnectDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
};

export const clearDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
};

const PASSWORD = 'Password123';
let counter = 0;
const uniqueEmail = (prefix = 'user') => {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}@test.com`;
};

export const registerUser = async (app, { email = uniqueEmail(), password = PASSWORD } = {}) => {
  const res = await request(app).post('/api/user/register').send({ email, password });
  return { ...res.body, email, password };
};

export const verifyUser = async (app, accessToken, code) => {
  await request(app)
    .put('/api/user/validation')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ code });
};

export const setupAdminWithCompany = async (app, { cif } = {}) => {
  const reg = await registerUser(app);
  const User = (await import('../src/models/User.js')).default;
  const dbUser = await User.findOne({ email: reg.email });
  await verifyUser(app, reg.accessToken, dbUser.verificationCode);

  const personal = await request(app)
    .put('/api/user/register')
    .set('Authorization', `Bearer ${reg.accessToken}`)
    .send({
      name: 'Admin',
      lastName: 'Tester',
      nif: `AD${Date.now()}${counter}`,
    });

  const companyCif = cif ?? `B${Date.now()}${counter}`;
  await request(app)
    .patch('/api/user/company')
    .set('Authorization', `Bearer ${reg.accessToken}`)
    .send({ isFreelance: false, name: 'Empresa Test SL', cif: companyCif });

  return {
    accessToken: reg.accessToken,
    refreshToken: reg.refreshToken,
    email: reg.email,
    password: reg.password,
    cif: companyCif,
    personal: personal.body.user,
  };
};

export const createSampleClient = async (app, accessToken, overrides = {}) => {
  const res = await request(app)
    .post('/api/client')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Cliente Demo SL',
      cif: `C${Date.now()}${counter++}`,
      email: 'cliente@demo.com',
      phone: '600000000',
      address: { street: 'Calle Mayor', number: '1', city: 'Madrid' },
      ...overrides,
    });
  return res.body.client;
};

export const createSampleProject = async (app, accessToken, clientId, overrides = {}) => {
  const res = await request(app)
    .post('/api/project')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      name: 'Proyecto Demo',
      projectCode: `P${Date.now()}${counter++}`,
      client: clientId,
      address: { street: 'Calle del Proyecto', city: 'Madrid' },
      ...overrides,
    });
  return res.body.project;
};
