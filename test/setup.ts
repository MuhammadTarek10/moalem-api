import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/core/interceptors/response.interceptor';

export default async (
  port: number,
): Promise<{ app: INestApplication; connection: Connection }> => {
  process.setMaxListeners(20);

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const connection = moduleFixture.get<Connection>(getConnectionToken());

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor(new Reflector()));

  await app.init();
  await app.listen(port);

  await connection.dropDatabase();

  pactum.request.setBaseUrl(`http://localhost:${port}/api`);

  return { app, connection };
};
