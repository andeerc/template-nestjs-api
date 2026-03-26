import { config } from 'dotenv';
import { validateEnv } from './env.validation';

config();

// Valida as variáveis de ambiente
validateEnv(process.env);

export const envConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '300', 10),
    max: parseInt(process.env.CACHE_MAX_ITEMS || '100', 10),
  },

  session: {
    secret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '604800', 10),
  },

  websocket: {
    path: process.env.WEBSOCKET_PATH || '/socket.io',
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    from: process.env.SMTP_FROM || 'noreply@api.com',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
  },
};
