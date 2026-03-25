import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { winstonConfig } from './common/logger/logger.config';
import { AllExceptionsFilter } from './common/exceptions';
import { RedisService } from './services/redis.service';
import { MongoDbModule } from './infrastructure/database/mongodb.module';
import { OrderDatabaseModule } from './infrastructure/database/order-database.module';

// Presentation controllers
import { OrderDddController } from './presentation/controllers/order.controller';
import { EstimationDddController } from './presentation/controllers/estimation.controller';

// Order use cases
import { CreateOrderUseCase } from './application/use-cases/order/create-order.use-case';
import { FindAllOrdersUseCase } from './application/use-cases/order/find-all-orders.use-case';
import { FindOneOrderUseCase } from './application/use-cases/order/find-one-order.use-case';
import { AcceptOrderUseCase } from './application/use-cases/order/accept-order.use-case';
import { RefuseOrderUseCase } from './application/use-cases/order/refuse-order.use-case';
import { DeleteOrderUseCase } from './application/use-cases/order/delete-order.use-case';
import { CompleteOrderUseCase } from './application/use-cases/order/complete-order.use-case';
import { MarkPaymentCompletedUseCase } from './application/use-cases/order/mark-payment-completed.use-case';
import { MarkDeliveredByClientUseCase } from './application/use-cases/order/mark-delivered-by-client.use-case';
import { MarkDeliveredByDeliveryUseCase } from './application/use-cases/order/mark-delivered-by-delivery.use-case';
import { StartDeliveryUseCase } from './application/use-cases/order/start-delivery.use-case';
import { GetOrderInternalUseCase } from './application/use-cases/order/get-order-internal.use-case';

// Estimation use cases
import { ClientCreateEstimationUseCase } from './application/use-cases/estimation/client-create-estimation.use-case';
import { DeliveryCreateEstimationUseCase } from './application/use-cases/estimation/delivery-create-estimation.use-case';
import { ConfirmEstimationUseCase } from './application/use-cases/estimation/confirm-estimation.use-case';
import { MarkEstimationPaidUseCase } from './application/use-cases/estimation/mark-estimation-paid.use-case';
import { AcceptDeliveryOfferUseCase } from './application/use-cases/estimation/accept-delivery-offer.use-case';
import { FindByOrderUseCase } from './application/use-cases/estimation/find-by-order.use-case';
import { FindPendingClientEstimationsUseCase } from './application/use-cases/estimation/find-pending-client-estimations.use-case';
import { FindAcceptedDeliveryEstimationsUseCase } from './application/use-cases/estimation/find-accepted-delivery-estimations.use-case';
import { FindEstimatedDeliveryEstimationsUseCase } from './application/use-cases/estimation/find-estimated-delivery-estimations.use-case';
import { FindDeliveredDeliveryEstimationsUseCase } from './application/use-cases/estimation/find-delivered-delivery-estimations.use-case';
import { FindEstimationByIdUseCase } from './application/use-cases/estimation/find-estimation-by-id.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    WinstonModule.forRoot(winstonConfig),
    MongoDbModule,
    OrderDatabaseModule,
  ],
  controllers: [
    AppController,
    OrderDddController,
    EstimationDddController,
  ],
  providers: [
    RedisService,
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Order use cases
    CreateOrderUseCase,
    FindAllOrdersUseCase,
    FindOneOrderUseCase,
    AcceptOrderUseCase,
    RefuseOrderUseCase,
    DeleteOrderUseCase,
    CompleteOrderUseCase,
    MarkPaymentCompletedUseCase,
    MarkDeliveredByClientUseCase,
    MarkDeliveredByDeliveryUseCase,
    StartDeliveryUseCase,
    GetOrderInternalUseCase,
    // Estimation use cases
    ClientCreateEstimationUseCase,
    DeliveryCreateEstimationUseCase,
    ConfirmEstimationUseCase,
    MarkEstimationPaidUseCase,
    AcceptDeliveryOfferUseCase,
    FindByOrderUseCase,
    FindPendingClientEstimationsUseCase,
    FindAcceptedDeliveryEstimationsUseCase,
    FindEstimatedDeliveryEstimationsUseCase,
    FindDeliveredDeliveryEstimationsUseCase,
    FindEstimationByIdUseCase,
  ],
})
export class AppModule {}
