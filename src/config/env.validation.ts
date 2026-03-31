import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('NestJS API Scaffold'),
  APP_DESCRIPTION: Joi.string().default(
    'NestJS API Scaffold with Fastify, PostgreSQL, Redis, and feature-first modules',
  ),
  HTTPS_ENABLED: Joi.boolean().default(false),
  HTTPS_KEY_PATH: Joi.string().optional().allow(''),
  HTTPS_CERT_PATH: Joi.string().optional().allow(''),

  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().default('api'),
  DB_USER: Joi.string().default('api'),
  DB_PASSWORD: Joi.string().default('api123'),
  DB_SSL: Joi.boolean().default(false),
  SNOWFLAKE_NODE_ID: Joi.number().integer().min(0).max(1023).default(0),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().default(0),

  // Cache
  CACHE_TTL: Joi.number().default(300),
  CACHE_MAX_ITEMS: Joi.number().default(100),

  // Session
  SESSION_SECRET: Joi.string().required().messages({
    'any.required': 'SESSION_SECRET is required for production',
    'string.empty': 'SESSION_SECRET cannot be empty',
  }),
  SESSION_MAX_AGE: Joi.number().default(604800000),
  SESSION_COOKIE_NAME: Joi.string().default('sessionId'),
  SESSION_COOKIE_SECURE: Joi.string()
    .valid('true', 'false', 'auto')
    .default('auto'),
  SESSION_COOKIE_SAME_SITE: Joi.string()
    .valid('lax', 'strict', 'none')
    .default('lax'),
  SESSION_COOKIE_PATH: Joi.string().default('/'),
  SESSION_COOKIE_DOMAIN: Joi.string().optional().allow(''),
  SESSION_SAVE_UNINITIALIZED: Joi.boolean().default(false),
  WEBSOCKET_PATH: Joi.string().default('/socket.io'),
  WS_PATH: Joi.string().optional().allow(''),
  WS_ALLOW_POLLING: Joi.boolean().default(false),
  WS_CONNECTION_STATE_RECOVERY_MAX_DISCONNECTION_MS: Joi.number().default(120000),

  // Email / SMTP
  SMTP_HOST: Joi.string().required().messages({
    'any.required': 'SMTP_HOST is required for email functionality',
    'string.empty': 'SMTP_HOST cannot be empty',
  }),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().required().messages({
    'any.required': 'SMTP_USER is required for email authentication',
    'string.empty': 'SMTP_USER cannot be empty',
  }),
  SMTP_PASS: Joi.string().required().messages({
    'any.required': 'SMTP_PASS is required for email authentication',
    'string.empty': 'SMTP_PASS cannot be empty',
  }),
  SMTP_FROM: Joi.string().email().default('noreply@api.com'),
  APP_URL: Joi.string().uri().required().messages({
    'any.required': 'APP_URL is required for frontend links',
    'string.empty': 'APP_URL cannot be empty',
    'string.uri': 'APP_URL must be a valid URL',
  }),
  API_URL: Joi.string().uri().required().messages({
    'any.required': 'API_URL is required for API links',
    'string.empty': 'API_URL cannot be empty',
    'string.uri': 'API_URL must be a valid URL',
  }),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),
});

/**
 * Valida as variáveis de ambiente
 * Lança erro se alguma validação falhar
 */
export function validateEnv(config: Record<string, unknown>) {
  const { error, value } = envValidationSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => detail.message).join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return value;
}
