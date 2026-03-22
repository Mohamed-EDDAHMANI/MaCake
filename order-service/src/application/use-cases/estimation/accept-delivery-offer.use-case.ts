import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { EstimationUserRole as SchemaEstimationUserRole, EstimationStatus as SchemaEstimationStatus } from '../../../infrastructure/database/schemas/estimation.schema';

@Injectable()
export class AcceptDeliveryOfferUseCase {
  private readonly logger = new Logger(AcceptDeliveryOfferUseCase.name);

  constructor(
    @Inject(ESTIMATION_REPOSITORY) private readonly estimationRepository: IEstimationRepository,
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
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

  async execute(deliveryEstimationId: string, clientUserId: string) {
    if (!deliveryEstimationId) {
      return { success: false, message: 'Invalid estimation id', statusCode: 400 };
    }
    if (!clientUserId || typeof clientUserId !== 'string') {
      return { success: false, message: 'Unauthorized', statusCode: 401 };
    }

    let deliveryEst: any = null;
    try {
      deliveryEst = await this.estimationRepository.findRawById(deliveryEstimationId);
    } catch (err: any) {
      this.logger.warn(`acceptDeliveryOffer findById error: ${err?.message ?? err}`);
      return { success: false, message: 'Invalid estimation id', statusCode: 400 };
    }

    if (!deliveryEst) {
      return { success: false, message: 'Estimation not found', statusCode: 404 };
    }
    if (deliveryEst.userRole !== SchemaEstimationUserRole.DELIVERY) {
      return { success: false, message: 'Not a delivery estimation', statusCode: 400 };
    }

    const orderId = String(deliveryEst.orderId);
    const deliveryUserId = deliveryEst.createdBy ?? null;
    if (!deliveryUserId) {
      return { success: false, message: 'Invalid delivery estimation', statusCode: 400 };
    }

    const order = await this.orderRepository.findWithItemsById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found', statusCode: 404 };
    }
    if (String(order.clientId) !== String(clientUserId)) {
      return { success: false, message: 'Only the order client can accept a delivery offer', statusCode: 403 };
    }

    let clientEst: any = null;
    try {
      clientEst = await this.estimationRepository.findRawByOrderIdAndRole(orderId, SchemaEstimationUserRole.CLIENT);
    } catch (err: any) {
      this.logger.warn(`acceptDeliveryOffer findOne client estimation error: ${err?.message ?? err}`);
      return { success: false, message: 'Client estimation lookup failed', statusCode: 500 };
    }

    if (!clientEst) {
      return { success: false, message: 'Client estimation not found', statusCode: 404 };
    }

    clientEst.acceptedBy = deliveryUserId;
    clientEst.status = SchemaEstimationStatus.CONFIRMED;
    try {
      await this.estimationRepository.saveRaw(clientEst);
    } catch (err: any) {
      this.logger.error(`acceptDeliveryOffer save error: ${err?.message ?? err}`, err?.stack);
      return { success: false, message: 'Failed to save acceptance', statusCode: 500 };
    }

    const data = this.mapDoc(clientEst);
    this.emitEstimationCreated(orderId);
    return { success: true, message: 'Delivery offer accepted', data };
  }
}
