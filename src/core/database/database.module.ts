import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Environment } from '../config/environment';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>(Environment.DATABASE_URL),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
