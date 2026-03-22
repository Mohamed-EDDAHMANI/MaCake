import { Injectable, Inject } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderItem, OrderItemDocument } from '../../../infrastructure/database/schemas/order-item.schema';

@Injectable()
export class FindAllOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
  ) {}

  async execute(userId: string, role: string) {
    if (!userId) {
      return new ServiceError('VALIDATION_ERROR', 'Missing authenticated user id', 400, 'order-service').toJSON();
    }

    const orders = await this.orderRepository.findMany({ userId, role });

    if (orders.length === 0) {
      return { success: true, message: 'Orders fetched successfully', data: [] };
    }

    const orderIds = orders.map((o) => new Types.ObjectId(o.id));

    const firstItems = await this.orderItemModel
      .aggregate([
        { $match: { orderId: { $in: orderIds } } },
        { $sort: { _id: 1 } },
        { $group: { _id: '$orderId', productId: { $first: '$productId' }, itemCount: { $sum: 1 } } },
      ])
      .exec();

    const firstItemByOrderId = new Map<string, { productId: string; itemCount: number }>();
    for (const row of firstItems) {
      firstItemByOrderId.set(String(row._id), { productId: row.productId, itemCount: row.itemCount });
    }

    return {
      success: true,
      message: 'Orders fetched successfully',
      data: orders.map((order) => {
        const first = firstItemByOrderId.get(order.id);
        return {
          id: order.id,
          clientId: order.clientId,
          patissiereId: order.patissiereId,
          patissiereAddress: order.patissiereAddress,
          deliveryAddress: order.deliveryAddress,
          deliveryAddressSource: order.deliveryAddressSource,
          deliveryLatitude: order.deliveryLatitude ?? null,
          deliveryLongitude: order.deliveryLongitude ?? null,
          patissiereLatitude: order.patissiereLatitude ?? null,
          patissiereLongitude: order.patissiereLongitude ?? null,
          requestedDateTime: order.requestedDateTime,
          totalPrice: order.totalPrice,
          status: order.status,
          firstProductId: first?.productId ?? null,
          itemCount: first?.itemCount ?? 0,
          createdAt: order.createdAt,
        };
      }),
    };
  }
}
