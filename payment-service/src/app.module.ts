import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { winstonConfig } from './common/logger/logger.config';
import { AllExceptionsFilter } from './common/exceptions';
import { RedisService } from './services/redis.service';
import { MongoDbModule } from './database/mongodb.module';
import { PaymentDatabaseModule } from './infrastructure/database/payment-database.module';
import { MessagingModule } from './messaging';
import { PaymentController } from './presentation/controllers/payment.controller';
import { CreatePaymentUseCase } from './application/use-cases/payment/create-payment.use-case';
import { CreateDeliveryPaymentUseCase } from './application/use-cases/payment/create-delivery-payment.use-case';
import { TopUpWalletUseCase } from './application/use-cases/payment/top-up-wallet.use-case';
import { StripeWalletWebhookUseCase } from './application/use-cases/payment/stripe-wallet-webhook.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot(winstonConfig),
    MongoDbModule,
    PaymentDatabaseModule,
    MessagingModule,
  ],
  controllers: [AppController, PaymentController],
  providers: [
    AppService,
    RedisService,
    CreatePaymentUseCase,
    CreateDeliveryPaymentUseCase,
    TopUpWalletUseCase,
    StripeWalletWebhookUseCase,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
