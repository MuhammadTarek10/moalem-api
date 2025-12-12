import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import swaggerConfig from './swagger.config';
import { validationSchema } from './validation.schema';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        const result = validationSchema.safeParse(config);
        if (!result.success) {
          throw new Error(
            `Config validation error: ${JSON.stringify(result.error.format())}`,
          );
        }
        return result.data;
      },
      load: [appConfig, databaseConfig, swaggerConfig, jwtConfig],
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
  ],
})
export class ConfigModule {}
