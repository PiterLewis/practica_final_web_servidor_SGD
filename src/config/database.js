import mongoose from 'mongoose';
import { config } from './index.js';

mongoose.set('strictQuery', true);

export const connectDatabase = async (uri = config.mongo.uri) => {
  if (!uri) {
    throw new Error('MONGODB_URI no está definido');
  }
  await mongoose.connect(uri);
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const dbStatus = () => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] ?? 'unknown';
};
