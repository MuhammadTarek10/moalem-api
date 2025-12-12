import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { Environment } from './core/config/environment';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const config = app.get(ConfigService);
  const port = config.get<number>(Environment.PORT) ?? 3000;

  app.use(cookieParser());

  const frontendUrl = config.get<string>(Environment.FRONTEND_URL);
  const frontendUrlProd = config.get<string>(Environment.FRONTEND_URL_PROD);
  const allowedOrigins = [frontendUrl, frontendUrlProd].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
    defaultVersion: '1',
  });

  const docConfig = new DocumentBuilder()
    .setTitle('Auth API')
    .setDescription(
      'Auth API with dual authentication support: Bearer tokens and HTTP-only cookies',
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'JWT Bearer token for access. Alternatively, use HTTP-only cookies.',
    })
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
      description: 'HTTP-only cookie containing the access token',
    })
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
      description: 'HTTP-only cookie containing the refresh token',
    })
    .build();
  const document = SwaggerModule.createDocument(app, docConfig);

  app.use(
    ['/docs', '/docs-json'],
    basicAuth({
      challenge: true,
      users: {
        [config.getOrThrow<string>(Environment.SWAGGER_USER) || 'admin']:
          config.getOrThrow<string>(Environment.SWAGGER_PASSWORD) || 'admin',
      },
    }),
  );

  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
}
void bootstrap();
