import { Injectable, Inject } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderItem, OrderItemDocument } from '../../../infrastructure/database/schemas/order-item.schema';

@Injectable()
export class FindOneOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
  ) {}

  async execute(orderId: string, userId: string, role: string) {
    if (!orderId) {
      return new ServiceError('VALIDATION_ERROR', 'Missing order id', 400, 'order-service').toJSON();
    }
    if (!Types.ObjectId.isValid(orderId)) {
      return new ServiceError('VALIDATION_ERROR', 'Invalid order id', 400, 'order-service').toJSON();
    }
    if (!userId) {
      return new ServiceError('VALIDATION_ERROR', 'Missing authenticated user id', 400, 'order-service').toJSON();
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found', data: null };
    }

    // Role-based access check
    const normalizedRole = (role || '').toLowerCase();
    const isDelivery = normalizedRole === 'delivery' || normalizedRole === 'livreur';
    if (!isDelivery && !order.canBeModifiedBy(userId, role)) {
      return { success: false, message: 'Order not found', data: null };
    }

    const items = await this.orderItemModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .lean()
      .exec();

    return {
      success: true,
      message: 'Order fetched successfully',
      data: {
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
        items: items.map((it) => ({
          id: String(it._id),
          orderId: String(it.orderId),
          productId: it.productId,
          quantity: it.quantity,
          price: it.price,
          customizationDetails: it.customizationDetails,
        })),
        createdAt: order.createdAt,
      },
    };
  }
}
