import { z } from 'zod';

export const validationSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  APP_PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  // Frontend
  FRONTEND_URL: z.string().min(1, { message: 'FRONTEND_URL is required' }),
  FRONTEND_URL_PROD: z.string().optional(),

  // Database
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),

  // Swagger
  SWAGGER_USER: z.string().min(1, { message: 'SWAGGER_USER is required' }),
  SWAGGER_PASSWORD: z
    .string()
    .min(1, { message: 'SWAGGER_PASSWORD is required' }),

  // JWT
  JWT_ACCESS_SECRET: z
    .string()
    .min(1, { message: 'JWT_ACCESS_SECRET is required' }),
  JWT_ACCESS_EXPIRES_IN: z
    .string()
    .min(1, { message: 'JWT_ACCESS_EXPIRES_IN is required' }),
  JWT_REFRESH_SECRET: z
    .string()
    .min(1, { message: 'JWT_REFRESH_SECRET is required' }),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .min(1, { message: 'JWT_REFRESH_EXPIRES_IN is required' }),
});
