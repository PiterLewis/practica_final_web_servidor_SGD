// Augmentación de Express: el middleware authenticate adjunta el usuario en req.user

import type { HydratedDocument } from 'mongoose';
import type { IUser } from './entities.js';

declare global {
  namespace Express {
    interface Request {
      user?: HydratedDocument<IUser>;
      file?: Express.Multer.File;
    }
  }
}

export {};
