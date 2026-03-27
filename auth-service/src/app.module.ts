import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './services/redis.service';
import { ConfigModule } from '@nestjs/config';
import { UsersController } from './users/users.controller';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/logger.config';
import { AllExceptionsFilter } from './common/exceptions';
import { MongoDbModule } from './database/mongodb.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongoDbModule,
    S3Module,
    UsersModule,
    AuthModule,
    WinstonModule.forRoot(winstonConfig),
  ],
  controllers: [AppController, UsersController],
  providers: [
    AppService,
    RedisService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
