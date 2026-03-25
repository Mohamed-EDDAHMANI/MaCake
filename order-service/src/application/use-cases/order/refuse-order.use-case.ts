import { Injectable, Inject } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderItem, OrderItemDocument } from '../../../infrastructure/database/schemas/order-item.schema';

@Injectable()
export class RefuseOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
  ) {}

  private async mapOrderWithItems(order: any) {
    const items = await this.orderItemModel
      .find({ orderId: new Types.ObjectId(order.id) })
      .lean()
      .exec();
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
      items: items.map((it) => ({
        id: String(it._id),
        orderId: String(it.orderId),
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
        customizationDetails: it.customizationDetails,
      })),
      createdAt: order.createdAt,
    };
  }

  async execute(orderId: string, userId: string) {
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
    if (!order || order.patissiereId !== userId) {
      return { success: false, message: 'Order not found', data: null };
    }

    if (order.status !== OrderStatus.PENDING) {
      return { success: false, message: 'Only pending orders can be refused', data: null };
    }

    const updated = await this.orderRepository.update(orderId, { status: OrderStatus.REFUSED });
    if (!updated) {
      return { success: false, message: 'Order not found', data: null };
    }

    return {
      success: true,
      message: 'Order refused successfully',
      data: await this.mapOrderWithItems(updated),
    };
  }
}
