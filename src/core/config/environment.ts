export const Environment = {
  // App
  NODE_ENV: 'app.env',
  PORT: 'app.port',
  LOG_LEVEL: 'app.log_level',

  // Frontend
  FRONTEND_URL: 'app.frontend_url',
  FRONTEND_URL_PROD: 'app.frontend_url_prod',

  // Database
  DATABASE_URL: 'database.uri',

  // Swagger
  SWAGGER_USER: 'swagger.user',
  SWAGGER_PASSWORD: 'swagger.password',

  // JWT
  JWT_ACCESS_SECRET: 'jwt.access_secret',
  JWT_ACCESS_EXPIRES_IN: 'jwt.access_expires_in',
  JWT_REFRESH_SECRET: 'jwt.refresh_secret',
  JWT_REFRESH_EXPIRES_IN: 'jwt.refresh_expires_in',

  // Keys
  PRIVATE_KEY: 'keys.private_key',
  PUBLIC_KEY: 'keys.public_key',
} as const;
