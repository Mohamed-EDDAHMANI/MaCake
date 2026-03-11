import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { winstonConfig } from './common/logger/logger.config';
import { AllExceptionsFilter } from './common/exceptions';
import { OrderModule } from './modules/order/order.module';
import { OrderItemModule } from './modules/order-item/order-item.module';
import { RedisModule } from './modules/redis/redis.module';
import { MongoDbModule } from './infrastructure/database/mongodb.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot(winstonConfig),
    MongoDbModule,
    RedisModule, // Important: keep this
    OrderModule,
    OrderItemModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // RedisService is now provided by RedisModule, remove it from here to avoid dual instantiation
    // or keep it if you intended to override it, but better remove it to treat RedisModule as source of truth
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
