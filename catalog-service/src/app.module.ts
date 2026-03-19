import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './services/redis.service';
import { WinstonModule } from 'nest-winston';
import { ConfigModule } from '@nestjs/config';
import { winstonConfig } from './common/logger/logger.config';
import { MessagingModule } from './messaging';
import { AllExceptionsFilter } from './common/exceptions';
import { MongoDbModule } from './database/mongodb.module';
import { CatalogModule } from './catalog.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongoDbModule,
    S3Module,
    WinstonModule.forRoot(winstonConfig),
    CatalogModule,
  ],
  controllers: [AppController],
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
