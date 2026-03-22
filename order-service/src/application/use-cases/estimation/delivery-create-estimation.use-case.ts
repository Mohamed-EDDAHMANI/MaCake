import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { EstimationUserRole } from '../../../domain/entities/estimation.entity';

export interface DeliveryCreateEstimationPayload {
  orderId: string;
  details: string;
  price: number;
}

@Injectable()
export class DeliveryCreateEstimationUseCase {
  private readonly logger = new Logger(DeliveryCreateEstimationUseCase.name);

  constructor(
    @Inject(ESTIMATION_REPOSITORY) private readonly estimationRepository: IEstimationRepository,
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

  async execute(payload: DeliveryCreateEstimationPayload, userId?: string) {
    if (typeof payload.price !== 'number' || payload.price < 0) {
      return new ServiceError('VALIDATION_ERROR', 'Price must be a non-negative number', 400, 'order-service').toJSON();
    }

    const estimation = await this.estimationRepository.create({
      orderId: payload.orderId,
      details: payload.details,
      price: payload.price,
      userRole: EstimationUserRole.DELIVERY,
      createdBy: userId ?? null,
    });

    this.emitEstimationCreated(payload.orderId);

    return {
      success: true,
      message: 'Delivery estimation created',
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
