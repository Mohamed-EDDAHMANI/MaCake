import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import {
  Estimation,
  EstimationDocument,
  EstimationStatus,
  EstimationUserRole,
} from '../../infrastructure/database/schemas/estimation.schema';
import { CreateEstimationDto } from './dto/create-estimation.dto';
import { OrderService } from '../order/order.service';
import { OrderStatus } from '../../infrastructure/database/schemas/order.schema';

@Injectable()
export class EstimationService {
  private readonly logger = new Logger(EstimationService.name);

  constructor(
    @InjectModel(Estimation.name)
    private readonly estimationModel: Model<EstimationDocument>,
    private readonly orderService: OrderService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Emit real-time event to gateway when an estimation is created (clients refetch list).
   */
  private emitEstimationCreated(orderId: string) {
    try {
      const baseUrl =
        this.configService.get<string>('GATEWAY_WS_URL') ||
        'http://gateway:3000/orders';
      const socket = io(baseUrl, { transports: ['websocket'] });
      socket.emit('estimation.created', { orderId });
      setTimeout(() => socket.disconnect(), 500);
    } catch (error: any) {
      this.logger.warn(`Failed to emit estimation.created: ${error?.message ?? 'unknown'}`);
    }
  }

  private mapEstimation(doc: EstimationDocument) {
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

  /**
   * Client creates estimation: userRole = client, status = pending.
   * Also moves order to "out for delivery" (delivering) when order is completed.
   */
  async clientCreateEstimation(dto: CreateEstimationDto) {
    const estimation = await this.estimationModel.create({
      orderId: new Types.ObjectId(dto.orderId),
      details: dto.details,
      price: dto.price,
      userRole: EstimationUserRole.CLIENT,
      status: EstimationStatus.PENDING,
    });

    const order = await this.orderService.getOrderByIdForInternal(dto.orderId);
    if (order?.status === OrderStatus.COMPLETED) {
      await this.orderService.startDelivery(dto.orderId, order.clientId);
    }

    const data = this.mapEstimation(estimation);
    this.emitEstimationCreated(dto.orderId);

    return {
      success: true,
      message: 'Client estimation created',
      data,
    };
  }

  /**
   * Delivery creates estimation: userRole = delivery, status = pending, createdBy = userId.
   */
  async deliveryCreateEstimation(dto: CreateEstimationDto, userId?: string) {
    const estimation = await this.estimationModel.create({
      orderId: new Types.ObjectId(dto.orderId),
      details: dto.details,
      price: dto.price,
      userRole: EstimationUserRole.DELIVERY,
      status: EstimationStatus.PENDING,
      createdBy: userId ?? null,
    });
    const data = this.mapEstimation(estimation);
    this.emitEstimationCreated(dto.orderId);
    return {
      success: true,
      message: 'Delivery estimation created',
      data,
    };
  }

  /**
   * Delivery confirms an estimation:
   * - Client estimation (pending): delivery accepts the client's request → set status confirmed.
   * - Delivery estimation (pending, createdBy = userId): delivery confirms their own estimate → set status confirmed.
   */
  async confirmEstimation(estimationId: string, userId: string) {
    const doc = await this.estimationModel.findById(estimationId).exec();
    if (!doc) {
      return { success: false, message: 'Estimation not found', statusCode: 404 };
    }
    if (doc.status === EstimationStatus.CONFIRMED) {
      // Delivery can "confirm" from workspace to complete the mission (mark order delivered)
      const isDeliveryOwnEstimation = doc.userRole === EstimationUserRole.DELIVERY && doc.createdBy === userId;
      const isClientEstimationAcceptedByMe = doc.userRole === EstimationUserRole.CLIENT && (doc as any).acceptedBy === userId;
      if (isDeliveryOwnEstimation || isClientEstimationAcceptedByMe) {
        await this.orderService.markDeliveredByDelivery(String(doc.orderId));
      }
      return { success: true, message: 'Already confirmed', data: this.mapEstimation(doc) };
    }
    if (doc.userRole === EstimationUserRole.CLIENT) {
      // Delivery accepts the client's estimation (like accepting the order request)
      doc.status = EstimationStatus.CONFIRMED;
      (doc as any).acceptedBy = userId;
      await doc.save();
      const data = this.mapEstimation(doc);
      this.emitEstimationCreated(String(doc.orderId));
      return { success: true, message: 'Client estimation accepted', data };
    }
    if (doc.userRole === EstimationUserRole.DELIVERY) {
      if (doc.createdBy !== userId) {
        return { success: false, message: 'You can only confirm your own estimation', statusCode: 403 };
      }
      doc.status = EstimationStatus.CONFIRMED;
      await doc.save();
      // Mark order as delivered when delivery confirms (order delivered successfully)
      await this.orderService.markDeliveredByDelivery(String(doc.orderId));
      const data = this.mapEstimation(doc);
      this.emitEstimationCreated(String(doc.orderId));
      return { success: true, message: 'Estimation confirmed', data };
    }
    return { success: false, message: 'Invalid estimation role', statusCode: 403 };
  }

  /**
   * Mark estimation as paid (client paid the delivery fee).
   */
  async markEstimationPaid(estimationId: string) {
    const doc = await this.estimationModel.findById(estimationId).exec();
    if (!doc) {
      return { success: false, message: 'Estimation not found', statusCode: 404 };
    }
    if ((doc as any).paidAt) {
      return { success: true, message: 'Already paid', data: this.mapEstimation(doc) };
    }
    (doc as any).paidAt = new Date();
    await doc.save();
    const data = this.mapEstimation(doc);
    this.emitEstimationCreated(String(doc.orderId));
    return { success: true, message: 'Delivery payment recorded', data };
  }

  /**
   * Build list of estimations with order + items from a list of docs.
   */
  private async buildDeliveryEstimationListFromDocs(
    list: Array<{ _id: any; orderId: any; details: string; price: number; userRole: string; status: string; createdBy?: string | null; acceptedBy?: string | null; paidAt?: Date | null; createdAt: Date }>,
  ) {
    const data: Array<{
      estimation: { id: string; orderId: string; details: string; price: number; userRole: string; status: string; createdBy?: string | null; acceptedBy?: string | null; paidAt?: Date | null; createdAt: Date };
      order: any;
    }> = [];

    for (const doc of list) {
      const orderId = String(doc.orderId);
      const order = await this.orderService.getOrderWithItemsById(orderId);
      if (!order) continue;
      data.push({
        estimation: {
          id: String(doc._id),
          orderId,
          details: doc.details,
          price: doc.price,
          userRole: doc.userRole,
          status: doc.status,
          createdBy: doc.createdBy ?? null,
          acceptedBy: doc.acceptedBy ?? null,
          paidAt: doc.paidAt ?? null,
          createdAt: doc.createdAt,
        },
        order,
      });
    }

    return { success: true, data };
  }

  /**
   * Build list of estimations with order + items, only including orders with given status.
   */
  private async buildDeliveryEstimationListFromDocsWithOrderStatus(
    list: Array<{ _id: any; orderId: any; details: string; price: number; userRole: string; status: string; createdBy?: string | null; acceptedBy?: string | null; paidAt?: Date | null; createdAt: Date }>,
    orderStatus: OrderStatus,
  ) {
    const data: Array<{
      estimation: { id: string; orderId: string; details: string; price: number; userRole: string; status: string; createdBy?: string | null; acceptedBy?: string | null; paidAt?: Date | null; createdAt: Date };
      order: any;
    }> = [];

    for (const doc of list) {
      const orderId = String(doc.orderId);
      const order = await this.orderService.getOrderWithItemsById(orderId);
      if (!order || order.status !== orderStatus) continue;
      data.push({
        estimation: {
          id: String(doc._id),
          orderId,
          details: doc.details,
          price: doc.price,
          userRole: doc.userRole,
          status: doc.status,
          createdBy: doc.createdBy ?? null,
          acceptedBy: doc.acceptedBy ?? null,
          paidAt: doc.paidAt ?? null,
          createdAt: doc.createdAt,
        },
        order,
      });
    }

    return { success: true, data };
  }

  /**
   * Build list of estimations with order + items, excluding orders with given status (e.g. delivered for Accepted tab).
   */
  private async buildDeliveryEstimationListFromDocsExcludingOrderStatus(
    list: Array<{ _id: any; orderId: any; details: string; price: number; userRole: string; status: string; createdBy?: string | null; acceptedBy?: string | null; paidAt?: Date | null; createdAt: Date }>,
    excludeStatus: OrderStatus,
  ) {
    const data: Array<{
      estimation: { id: string; orderId: string; details: string; price: number; userRole: string; status: string; createdBy?: string | null; acceptedBy?: string | null; paidAt?: Date | null; createdAt: Date };
      order: any;
    }> = [];

    for (const doc of list) {
      const orderId = String(doc.orderId);
      const order = await this.orderService.getOrderWithItemsById(orderId);
      if (!order || order.status === excludeStatus) continue;
      data.push({
        estimation: {
          id: String(doc._id),
          orderId,
          details: doc.details,
          price: doc.price,
          userRole: doc.userRole,
          status: doc.status,
          createdBy: doc.createdBy ?? null,
          acceptedBy: doc.acceptedBy ?? null,
          paidAt: doc.paidAt ?? null,
          createdAt: doc.createdAt,
        },
        order,
      });
    }

    return { success: true, data };
  }

  /**
   * Build list of estimations with order + items (filter by single role/status/createdBy).
   */
  private async buildDeliveryEstimationList(
    filter: { userRole: EstimationUserRole; status: EstimationStatus; createdBy: string },
  ) {
    const list = await this.estimationModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.buildDeliveryEstimationListFromDocs(list);
  }

  /**
   * Get estimations that are confirmed and either created by this delivery or accepted/confirmed by this delivery (Accepted tab).
   * Excludes orders with status delivered (those appear only in Historic).
   */
  async findAcceptedDeliveryEstimations(userId: string) {
    const list = await this.estimationModel
      .find({
        status: EstimationStatus.CONFIRMED,
        $or: [
          { userRole: EstimationUserRole.DELIVERY, createdBy: userId },
          { userRole: EstimationUserRole.CLIENT, acceptedBy: userId },
        ],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.buildDeliveryEstimationListFromDocsExcludingOrderStatus(list, OrderStatus.DELIVERED);
  }

  /**
   * Get delivery estimations with status pending and createdBy = userId (Estimated tab: delivery has sent estimate, not yet confirmed).
   */
  async findEstimatedDeliveryEstimations(userId: string) {
    return this.buildDeliveryEstimationList({
      userRole: EstimationUserRole.DELIVERY,
      status: EstimationStatus.PENDING,
      createdBy: userId,
    });
  }

  /**
   * Get all orders done by this delivery (order status = delivered). For Historic tab.
   */
  async findDeliveredDeliveryEstimations(userId: string) {
    const list = await this.estimationModel
      .find({
        status: EstimationStatus.CONFIRMED,
        $or: [
          { userRole: EstimationUserRole.DELIVERY, createdBy: userId },
          { userRole: EstimationUserRole.CLIENT, acceptedBy: userId },
        ],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.buildDeliveryEstimationListFromDocsWithOrderStatus(list, OrderStatus.DELIVERED);
  }

  /**
   * Get one estimation by id (e.g. for payment-service to get delivery userId and amount).
   */
  async findEstimationById(estimationId: string) {
    if (!estimationId || !Types.ObjectId.isValid(estimationId)) {
      return { success: false, message: 'Invalid estimation id', statusCode: 400, data: null };
    }
    const doc = await this.estimationModel.findById(estimationId).lean().exec();
    if (!doc) {
      return { success: false, message: 'Estimation not found', statusCode: 404, data: null };
    }
    const d = doc as any;
    return {
      success: true,
      data: {
        id: String(d._id),
        orderId: String(d.orderId),
        price: d.price,
        acceptedBy: d.acceptedBy ?? null,
        createdBy: d.createdBy ?? null,
        status: d.status,
      },
    };
  }

  /**
   * Get all estimations for an order (client + delivery). Not stored in Redux on front.
   */
  async findByOrderId(orderId: string) {
    const list = await this.estimationModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return {
      success: true,
      data: list.map((doc: any) => ({
        id: String(doc._id),
        orderId: String(doc.orderId),
        details: doc.details,
        price: doc.price,
        userRole: doc.userRole,
        status: doc.status,
        createdBy: doc.createdBy ?? null,
        acceptedBy: doc.acceptedBy ?? null,
        paidAt: doc.paidAt ?? null,
        createdAt: doc.createdAt,
      })),
    };
  }

  /**
   * Client accepts a delivery's offer: set client estimation acceptedBy to delivery userId and status confirmed.
   */
  async acceptDeliveryOffer(deliveryEstimationId: string, clientUserId: string) {
    if (!deliveryEstimationId || !Types.ObjectId.isValid(deliveryEstimationId)) {
      return { success: false, message: 'Invalid estimation id', statusCode: 400 };
    }
    if (!clientUserId || typeof clientUserId !== 'string') {
      return { success: false, message: 'Unauthorized', statusCode: 401 };
    }
    let deliveryEst: EstimationDocument | null = null;
    try {
      deliveryEst = await this.estimationModel.findById(deliveryEstimationId).exec();
    } catch (err: any) {
      this.logger.warn(`acceptDeliveryOffer findById error: ${err?.message ?? err}`);
      return { success: false, message: 'Invalid estimation id', statusCode: 400 };
    }
    if (!deliveryEst) {
      return { success: false, message: 'Estimation not found', statusCode: 404 };
    }
    if ((deliveryEst as any).userRole !== EstimationUserRole.DELIVERY) {
      return { success: false, message: 'Not a delivery estimation', statusCode: 400 };
    }
    const orderId = String(deliveryEst.orderId);
    const deliveryUserId = (deliveryEst as any).createdBy ?? null;
    if (!deliveryUserId) {
      return { success: false, message: 'Invalid delivery estimation', statusCode: 400 };
    }
    if (!Types.ObjectId.isValid(orderId)) {
      return { success: false, message: 'Invalid order id', statusCode: 400 };
    }
    const order = await this.orderService.getOrderWithItemsById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found', statusCode: 404 };
    }
    if (String(order.clientId) !== String(clientUserId)) {
      return { success: false, message: 'Only the order client can accept a delivery offer', statusCode: 403 };
    }
    let clientEst: EstimationDocument | null = null;
    try {
      clientEst = await this.estimationModel
        .findOne({
          orderId: new Types.ObjectId(orderId),
          userRole: EstimationUserRole.CLIENT,
        })
        .exec();
    } catch (err: any) {
      this.logger.warn(`acceptDeliveryOffer findOne client estimation error: ${err?.message ?? err}`);
      return { success: false, message: 'Client estimation lookup failed', statusCode: 500 };
    }
    if (!clientEst) {
      return { success: false, message: 'Client estimation not found', statusCode: 404 };
    }
    (clientEst as any).acceptedBy = deliveryUserId;
    clientEst.status = EstimationStatus.CONFIRMED;
    try {
      await clientEst.save();
    } catch (err: any) {
      this.logger.error(`acceptDeliveryOffer save error: ${err?.message ?? err}`, err?.stack);
      return { success: false, message: 'Failed to save acceptance', statusCode: 500 };
    }
    const data = this.mapEstimation(clientEst);
    this.emitEstimationCreated(orderId);
    return { success: true, message: 'Delivery offer accepted', data };
  }

  /**
   * Get client estimations with pending status for delivery (available to accept).
   * Returns each estimation with full order and order items; front can add client/patissiere from auth.
   */
  async findPendingClientEstimations() {
    const list = await this.estimationModel
      .find({
        userRole: EstimationUserRole.CLIENT,
        status: EstimationStatus.PENDING,
      })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const data: Array<{
      estimation: { id: string; orderId: string; details: string; price: number; userRole: string; status: string; paidAt?: Date | null; createdAt: Date };
      order: any;
    }> = [];

    for (const doc of list) {
      const orderId = String(doc.orderId);
      const order = await this.orderService.getOrderWithItemsById(orderId);
      if (!order) continue;
      data.push({
        estimation: {
          id: String(doc._id),
          orderId,
          details: doc.details,
          price: doc.price,
          userRole: doc.userRole,
          status: doc.status,
          paidAt: doc.paidAt ?? null,
          createdAt: doc.createdAt,
        },
        order,
      });
    }

    return { success: true, data };
  }
}
