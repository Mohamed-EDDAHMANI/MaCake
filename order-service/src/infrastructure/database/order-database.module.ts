import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ORDER_REPOSITORY } from '../../domain/repositories/order.repository.interface';
import { ESTIMATION_REPOSITORY } from '../../domain/repositories/estimation.repository.interface';
import { OrderRepository } from './repositories/order.repository';
import { EstimationRepository } from './repositories/estimation.repository';
import { Order, OrderSchema } from './schemas/order.schema';
import { Estimation, EstimationSchema } from './schemas/estimation.schema';
import { OrderItem, OrderItemSchema } from './schemas/order-item.schema';
import { OrderStatusHistory, OrderStatusHistorySchema } from './schemas/order-status-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Estimation.name, schema: EstimationSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: OrderStatusHistory.name, schema: OrderStatusHistorySchema },
    ]),
  ],
  providers: [
    OrderRepository,
    EstimationRepository,
    { provide: ORDER_REPOSITORY, useClass: OrderRepository },
    { provide: ESTIMATION_REPOSITORY, useClass: EstimationRepository },
  ],
  exports: [ORDER_REPOSITORY, ESTIMATION_REPOSITORY, MongooseModule],
})
export class OrderDatabaseModule {}
