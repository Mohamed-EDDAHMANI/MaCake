import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';

export interface CreateOrderPayload {
  clientId: string;
  patissiereId: string;
  patissiereAddress: string;
  deliveryAddress: string;
  deliveryAddressSource?: 'profile' | 'current_location';
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  patissiereLatitude?: number | null;
  patissiereLongitude?: number | null;
  requestedDateTime: string;
  totalPrice?: number;
  items: Array<{
    productId: string;
    quantity: number;
    priceAtPurchase: number;
    customizationDetails?: any;
  }>;
}

@Injectable()
export class CreateOrderUseCase {
  private readonly logger = new Logger(CreateOrderUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
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
      this.logger.warn(`Failed to emit order status websocket event: ${error?.message ?? 'unknown error'}`);
    }
  }

  async execute(payload: CreateOrderPayload) {
    if (!payload.clientId || payload.clientId.trim() === '') {
      return new ServiceError('VALIDATION_ERROR', 'clientId is required', 400, 'order-service').toJSON();
    }
    if (!payload.patissiereId || payload.patissiereId.trim() === '') {
      return new ServiceError('VALIDATION_ERROR', 'patissiereId is required', 400, 'order-service').toJSON();
    }

    const requestedDateTime = new Date(payload.requestedDateTime);
    if (Number.isNaN(requestedDateTime.getTime())) {
      return new ServiceError('VALIDATION_ERROR', 'Invalid requestedDateTime', 400, 'order-service').toJSON();
    }

    const totalPrice = payload.totalPrice ?? 0;
    if (typeof totalPrice !== 'number' || Number.isNaN(totalPrice) || totalPrice < 0) {
      return new ServiceError('VALIDATION_ERROR', 'Price must be a non-negative number', 400, 'order-service').toJSON();
    }

    const order = await this.orderRepository.create({
      clientId: payload.clientId,
      patissiereId: payload.patissiereId,
      patissiereAddress: payload.patissiereAddress,
      deliveryAddress: payload.deliveryAddress,
      deliveryAddressSource: payload.deliveryAddressSource,
      deliveryLatitude: payload.deliveryLatitude ?? null,
      deliveryLongitude: payload.deliveryLongitude ?? null,
      patissiereLatitude: payload.patissiereLatitude ?? null,
      patissiereLongitude: payload.patissiereLongitude ?? null,
      requestedDateTime,
      totalPrice,
      items: payload.items,
    });

    this.emitOrderStatusChanged(order.id, OrderStatus.PENDING);

    return {
      success: true,
      message: 'Order created successfully',
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
        createdAt: order.createdAt,
      },
    };
  }
}
