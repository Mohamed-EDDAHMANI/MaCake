import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';

@Injectable()
export class MarkEstimationPaidUseCase {
  private readonly logger = new Logger(MarkEstimationPaidUseCase.name);

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

  async execute(estimationId: string) {
    const doc = await this.estimationRepository.findRawById(estimationId);
    if (!doc) {
      return { success: false, message: 'Estimation not found', statusCode: 404 };
    }
    if (doc.paidAt) {
      return { success: true, message: 'Already paid', data: this.mapDoc(doc) };
    }
    doc.paidAt = new Date();
    await this.estimationRepository.saveRaw(doc);
    const data = this.mapDoc(doc);
    this.emitEstimationCreated(String(doc.orderId));
    return { success: true, message: 'Delivery payment recorded', data };
  }
}
