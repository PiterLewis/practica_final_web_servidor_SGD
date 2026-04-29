const toInt = (val, def) => (val ? Number.parseInt(val, 10) : def);
const toBool = (val, def) => (val === undefined ? def : val === 'true');

export const config = {
  port: toInt(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isTest: process.env.NODE_ENV === 'test',
  mongo: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'jwt_secret_dev_only_no_usar_en_prod_xxxxxxxxxx',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'jwt_refresh_dev_only_no_usar_en_prod_xxxxxxxxxx',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  bcrypt: {
    rounds: toInt(process.env.BCRYPT_ROUNDS, 10),
  },
  rateLimit: {
    max: toInt(process.env.RATE_LIMIT_MAX, 200),
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? '*',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    enabled: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ),
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: toInt(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? 'BildyApp <no-reply@bildyapp.test>',
    enabled: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    enabled: Boolean(process.env.SLACK_WEBHOOK_URL),
  },
  upload: {
    maxBytes: toInt(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
  },
  shutdown: {
    timeoutMs: toInt(process.env.SHUTDOWN_TIMEOUT_MS, 10_000),
  },
};
