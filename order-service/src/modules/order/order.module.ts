import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order, OrderSchema } from '../../infrastructure/database/schemas/order.schema';
import {
  OrderStatusHistory,
  OrderStatusHistorySchema,
} from '../../infrastructure/database/schemas/order-status-history.schema';
import { OrderItem, OrderItemSchema } from '../../infrastructure/database/schemas/order-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderItem.name, schema: OrderItemSchema },
      { name: OrderStatusHistory.name, schema: OrderStatusHistorySchema },
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
