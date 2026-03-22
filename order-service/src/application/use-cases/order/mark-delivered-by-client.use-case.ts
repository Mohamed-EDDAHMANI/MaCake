import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderItem, OrderItemDocument } from '../../../infrastructure/database/schemas/order-item.schema';

@Injectable()
export class MarkDeliveredByClientUseCase {
  private readonly logger = new Logger(MarkDeliveredByClientUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
    private readonly configService: ConfigService,
  ) {}

  private emitOrderStatusChanged(orderId: string, status: OrderStatus) {
    try {
      const baseUrl =
        this.configService.get<string>('GATEWAY_WS_URL') || 'http://gateway:3000/orders';
      const socket = io(baseUrl, { transports: ['websocket'] });
      socket.emit('order.status.changed', { orderId, status });
      setTimeout(() => socket.disconnect(), 500);
    } catch (error: any) {
      this.logger.warn(`Failed to emit order status event: ${error?.message ?? 'unknown error'}`);
    }
  }

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

  async execute(orderId: string, clientId: string) {
    if (!orderId || !clientId) {
      return new ServiceError('VALIDATION_ERROR', 'Missing order id or client id', 400, 'order-service').toJSON();
    }
    if (!Types.ObjectId.isValid(orderId)) {
      return new ServiceError('VALIDATION_ERROR', 'Invalid order id', 400, 'order-service').toJSON();
    }

    const order = await this.orderRepository.findById(orderId);
    if (!order || order.clientId !== clientId) {
      return { success: false, message: 'Order not found', data: null };
    }

    if (order.status !== OrderStatus.COMPLETED) {
      return {
        success: true,
        message: 'Order is not in completed state',
        data: await this.mapOrderWithItems(order),
      };
    }

    const updated = await this.orderRepository.update(orderId, { status: OrderStatus.DELIVERED });
    if (!updated) {
      return { success: false, message: 'Order not found', data: null };
    }

    this.emitOrderStatusChanged(orderId, OrderStatus.DELIVERED);

    return {
      success: true,
      message: 'Order marked as delivered (picked up by client)',
      data: await this.mapOrderWithItems(updated),
    };
  }
}
