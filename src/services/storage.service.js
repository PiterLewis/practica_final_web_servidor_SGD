import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';
import { config } from '../config/index.js';
import { AppError } from '../utils/AppError.js';

let configured = false;
const ensureConfig = () => {
  if (!config.cloudinary.enabled) {
    throw AppError.internal('Cloudinary no está configurado', 'CLOUDINARY_DISABLED');
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
    configured = true;
  }
};

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

export const uploadSignature = async (buffer, { folder = 'bildyapp/signatures' } = {}) => {
  ensureConfig();
  // Optimizar la firma: redimensionar a máx 800px de ancho y convertir a webp
  const optimized = await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();

  const result = await uploadBuffer(optimized, {
    folder,
    resource_type: 'image',
    format: 'webp',
  });
  return { url: result.secure_url, publicId: result.public_id };
};

export const uploadLogo = async (buffer, { folder = 'bildyapp/logos' } = {}) => {
  ensureConfig();
  const optimized = await sharp(buffer)
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();
  const result = await uploadBuffer(optimized, {
    folder,
    resource_type: 'image',
    format: 'webp',
  });
  return { url: result.secure_url, publicId: result.public_id };
};

export const uploadPdf = async (buffer, { folder = 'bildyapp/deliverynotes', publicId } = {}) => {
  ensureConfig();
  const result = await uploadBuffer(buffer, {
    folder,
    resource_type: 'raw',
    public_id: publicId,
    format: 'pdf',
  });
  return { url: result.secure_url, publicId: result.public_id };
};

export const isStorageEnabled = () => config.cloudinary.enabled;
