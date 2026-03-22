import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';
import { EstimationUserRole } from '../../../domain/entities/estimation.entity';
import { StartDeliveryUseCase } from '../order/start-delivery.use-case';

export interface ClientCreateEstimationPayload {
  orderId: string;
  details: string;
  price: number;
}

@Injectable()
export class ClientCreateEstimationUseCase {
  private readonly logger = new Logger(ClientCreateEstimationUseCase.name);

  constructor(
    @Inject(ESTIMATION_REPOSITORY) private readonly estimationRepository: IEstimationRepository,
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
    private readonly startDeliveryUseCase: StartDeliveryUseCase,
    private readonly configService: ConfigService,
  ) {}

  private emitEstimationCreated(orderId: string) {
    try {
      const baseUrl =
        this.configService.get<string>('GATEWAY_WS_URL') || 'http://gateway:3000/orders';
      const socket = io(baseUrl, { transports: ['websocket'] });
      socket.emit('estimation.created', { orderId });
      setTimeout(() => socket.disconnect(), 500);
    } catch (error: any) {
      this.logger.warn(`Failed to emit estimation.created: ${error?.message ?? 'unknown'}`);
    }
  }

  async execute(payload: ClientCreateEstimationPayload) {
    if (typeof payload.price !== 'number' || Number.isNaN(payload.price) || payload.price < 0) {
      return new ServiceError('VALIDATION_ERROR', 'Price must be a non-negative number', 400, 'order-service').toJSON();
    }

    const estimation = await this.estimationRepository.create({
      orderId: payload.orderId,
      details: payload.details,
      price: payload.price,
      userRole: EstimationUserRole.CLIENT,
      createdBy: null,
    });

    const order = await this.orderRepository.findByIdForInternal(payload.orderId);
    if (order?.status === OrderStatus.COMPLETED) {
      await this.startDeliveryUseCase.execute(payload.orderId, order.clientId);
    }

    this.emitEstimationCreated(payload.orderId);

    return {
      success: true,
      message: 'Client estimation created',
      data: {
        id: estimation.id,
        orderId: estimation.orderId,
        details: estimation.details,
        price: estimation.price,
        userRole: estimation.userRole,
        status: estimation.status,
        createdBy: estimation.createdBy ?? null,
        acceptedBy: estimation.acceptedBy ?? null,
        paidAt: estimation.paidAt ?? null,
        createdAt: estimation.createdAt,
      },
    };
  }
}
