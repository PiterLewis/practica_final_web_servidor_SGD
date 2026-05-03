import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret_minimo_32_caracteres_xxxxxxxxxx';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_min_32_caracteres_xxxxxxx';
  process.env.NODE_ENV = 'test';
  process.env.SLACK_WEBHOOK_URL = '';
  globalThis.__MONGOD__ = mongod;
}
