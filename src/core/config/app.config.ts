import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV,
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  log_level: process.env.LOG_LEVEL ?? 'info',

  frontend_url: process.env.FRONTEND_URL ?? '',
  frontend_url_prod: process.env.FRONTEND_URL_PROD ?? '',
}));
