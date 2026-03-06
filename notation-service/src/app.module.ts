import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './services/redis.service';
import { winstonConfig } from './common/logger/logger.config';
import { AllExceptionsFilter } from './common/exceptions';
import { MongoDbModule } from './database/mongodb.module';
import { RatingModule } from './modules/rating/rating.module';
import { LikeModule } from './modules/like/like.module';
import { FollowerModule } from './modules/follower/follower.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongoDbModule,
    WinstonModule.forRoot(winstonConfig),
    RatingModule,
    LikeModule,
    FollowerModule,
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
