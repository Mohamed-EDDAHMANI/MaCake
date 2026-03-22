import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { MarkDeliveredByDeliveryUseCase } from '../order/mark-delivered-by-delivery.use-case';
import { EstimationUserRole as SchemaEstimationUserRole, EstimationStatus as SchemaEstimationStatus } from '../../../infrastructure/database/schemas/estimation.schema';

@Injectable()
export class ConfirmEstimationUseCase {
  private readonly logger = new Logger(ConfirmEstimationUseCase.name);

  constructor(
    @Inject(ESTIMATION_REPOSITORY) private readonly estimationRepository: IEstimationRepository,
    private readonly markDeliveredByDeliveryUseCase: MarkDeliveredByDeliveryUseCase,
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

  private mapDoc(doc: any) {
    return {
      id: String(doc._id),
      orderId: String(doc.orderId),
      details: doc.details,
      price: doc.price,
      userRole: doc.userRole,
      status: doc.status,
      createdBy: doc.createdBy ?? null,
      acceptedBy: (doc as any).acceptedBy ?? null,
      paidAt: (doc as any).paidAt ?? null,
      createdAt: doc.createdAt,
    };
  }

  async execute(estimationId: string, userId: string) {
    const doc = await this.estimationRepository.findRawById(estimationId);
    if (!doc) {
      return { success: false, message: 'Estimation not found', statusCode: 404 };
    }

    if (doc.status === SchemaEstimationStatus.CONFIRMED) {
      const isDeliveryOwnEstimation =
        doc.userRole === SchemaEstimationUserRole.DELIVERY && doc.createdBy === userId;
      const isClientEstimationAcceptedByMe =
        doc.userRole === SchemaEstimationUserRole.CLIENT && doc.acceptedBy === userId;
      if (isDeliveryOwnEstimation || isClientEstimationAcceptedByMe) {
        await this.markDeliveredByDeliveryUseCase.execute(String(doc.orderId));
      }
      return { success: true, message: 'Already confirmed', data: this.mapDoc(doc) };
    }

    if (doc.userRole === SchemaEstimationUserRole.CLIENT) {
      doc.status = SchemaEstimationStatus.CONFIRMED;
      doc.acceptedBy = userId;
      await this.estimationRepository.saveRaw(doc);
      const data = this.mapDoc(doc);
      this.emitEstimationCreated(String(doc.orderId));
      return { success: true, message: 'Client estimation accepted', data };
    }

    if (doc.userRole === SchemaEstimationUserRole.DELIVERY) {
      if (doc.createdBy !== userId) {
        return { success: false, message: 'You can only confirm your own estimation', statusCode: 403 };
      }
      doc.status = SchemaEstimationStatus.CONFIRMED;
      await this.estimationRepository.saveRaw(doc);
      await this.markDeliveredByDeliveryUseCase.execute(String(doc.orderId));
      const data = this.mapDoc(doc);
      this.emitEstimationCreated(String(doc.orderId));
      return { success: true, message: 'Estimation confirmed', data };
    }

    return { success: false, message: 'Invalid estimation role', statusCode: 403 };
  }
}
