import multer from 'multer';
import { AppError } from '../utils/AppError.js';
import { config } from '../config/index.js';

const ALLOWED_IMAGE = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const memoryStorage = multer.memoryStorage();

const imageFilter = (_req, file, cb) => {
  if (ALLOWED_IMAGE.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(AppError.badRequest('Solo se permiten imágenes (jpeg, png, gif, webp)', 'INVALID_FILE_TYPE'));
  }
};

export const uploadImage = (fieldName) =>
  multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: { fileSize: config.upload.maxBytes },
  }).single(fieldName);

export const uploadLogo = uploadImage('logo');
export const uploadSignature = uploadImage('signature');
