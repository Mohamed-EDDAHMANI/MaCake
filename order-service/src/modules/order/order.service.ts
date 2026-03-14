import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../../infrastructure/database/schemas/order.schema';
import { OrderItem, OrderItemDocument } from '../../infrastructure/database/schemas/order-item.schema';
import {
  OrderStatusHistory,
  OrderStatusHistoryDocument,
} from '../../infrastructure/database/schemas/order-status-history.schema';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';

@Injectable()
export class OrderService {
  private buildOrderFilterByRole(userId: string, role: string) {
    const normalizedRole = (role || '').toLowerCase();
    const isPatissiere = normalizedRole === 'patissiere';

    return isPatissiere
      ? { $or: [{ clientId: userId }, { patissiereId: userId }] }
      : { clientId: userId };
  }

  private async mapOrderDocument(order: OrderDocument | (Order & { _id: Types.ObjectId })) {
    const orderId = String((order as any)._id ?? (order as any).id);
    const items = await this.orderItemModel.find({ orderId: new Types.ObjectId(orderId) }).lean().exec();

    return {
      id: orderId,
      clientId: order.clientId,
      patissiereId: order.patissiereId,
      patissiereAddress: order.patissiereAddress,
      deliveryAddress: order.deliveryAddress,
      deliveryAddressSource: order.deliveryAddressSource,
      deliveryLatitude: order.deliveryLatitude ?? null,
      deliveryLongitude: order.deliveryLongitude ?? null,
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

  public readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(OrderStatusHistory.name)
    private readonly orderStatusHistoryModel: Model<OrderStatusHistoryDocument>,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Emit websocket event to gateway when order status changes.
   */
  private emitOrderStatusChanged(orderId: string, status: OrderStatus) {
    try {
      const baseUrl =
        this.configService.get<string>('GATEWAY_WS_URL') ||
        // Docker service name for gateway on the compose network
        'http://gateway:3000/orders';

      const socket = io(baseUrl, {
        transports: ['websocket'],
      });

      socket.emit('order.status.changed', { orderId, status });

      // Best-effort: disconnect shortly after emitting
      setTimeout(() => {
        socket.disconnect();
      }, 500);
    } catch (error: any) {
      this.logger.warn(`Failed to emit order status websocket event: ${error?.message ?? 'unknown error'}`);
    }
  }

  async create(createOrderDto: CreateOrderDto) {
    this.logger.log(`Creating order for client ${createOrderDto.clientId}`);

    // 1. Persist order core document
    const requestedDateTime = new Date(createOrderDto.requestedDateTime);
    if (Number.isNaN(requestedDateTime.getTime())) {
      throw new BadRequestException('Invalid requestedDateTime');
    }

    const order = await this.orderModel.create({
      clientId: createOrderDto.clientId,
      patissiereId: createOrderDto.patissiereId,
      patissiereAddress: createOrderDto.patissiereAddress,
      deliveryAddress: createOrderDto.deliveryAddress,
      deliveryAddressSource: createOrderDto.deliveryAddressSource,
      deliveryLatitude: createOrderDto.deliveryLatitude ?? null,
      deliveryLongitude: createOrderDto.deliveryLongitude ?? null,
      requestedDateTime,
      totalPrice: createOrderDto.totalPrice ?? 0,
      status: OrderStatus.PENDING,
    });

    // 2. Persist order items
    const orderItemsPayload = createOrderDto.items.map((item) => ({
      orderId: order._id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.priceAtPurchase,
      customizationDetails: item.customizationDetails,
    }));
    const orderItems = await this.orderItemModel.insertMany(orderItemsPayload);

    // 3. Persist initial status history
    await this.orderStatusHistoryModel.create({
      orderId: order._id,
      status: OrderStatus.PENDING,
      changedAt: new Date(),
    });

    return {
      success: true,
      message: 'Order created successfully',
      data: {
        id: order._id.toString(),
        clientId: order.clientId,
        patissiereId: order.patissiereId,
        patissiereAddress: order.patissiereAddress,
        deliveryAddress: order.deliveryAddress,
        deliveryAddressSource: order.deliveryAddressSource,
        deliveryLatitude: order.deliveryLatitude ?? null,
        deliveryLongitude: order.deliveryLongitude ?? null,
        requestedDateTime: order.requestedDateTime,
        totalPrice: order.totalPrice,
        status: order.status,
        items: orderItems.map((it) => ({
          id: it._id.toString(),
          orderId: it.orderId.toString(),
          productId: it.productId,
          quantity: it.quantity,
          price: it.price,
          customizationDetails: it.customizationDetails,
        })),
        createdAt: order.createdAt,
      },
    };
  }

  async findAll(userId: string, role: string) {
    if (!userId) {
      throw new BadRequestException('Missing authenticated user id');
    }

    const filter = this.buildOrderFilterByRole(userId, role);

    const orders = await this.orderModel.find(filter).sort({ createdAt: -1 }).lean().exec();
    if (orders.length === 0) {
      return {
        success: true,
        message: 'Orders fetched successfully',
        data: [],
      };
    }

    const orderIds = orders.map((o) => new Types.ObjectId(String(o._id)));
    const allItems = await this.orderItemModel.find({ orderId: { $in: orderIds } }).lean().exec();

    const itemsByOrderId = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const key = String(item.orderId);
      const existing = itemsByOrderId.get(key) ?? [];
      existing.push(item);
      itemsByOrderId.set(key, existing);
    }

    return {
      success: true,
      message: 'Orders fetched successfully',
      data: orders.map((order) => {
        const items = itemsByOrderId.get(String(order._id)) ?? [];
        return {
          id: String(order._id),
          clientId: order.clientId,
          patissiereId: order.patissiereId,
          patissiereAddress: order.patissiereAddress,
          deliveryAddress: order.deliveryAddress,
          deliveryAddressSource: order.deliveryAddressSource,
          deliveryLatitude: order.deliveryLatitude ?? null,
          deliveryLongitude: order.deliveryLongitude ?? null,
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
      }),
    };
  }

  async findPatissiereOrders(userId: string) {
    return this.findAll(userId, 'patissiere');
  }

  async acceptOrder(orderId: string, userId: string) {
    if (!orderId) {
      throw new BadRequestException('Missing order id');
    }
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order id');
    }
    if (!userId) {
      throw new BadRequestException('Missing authenticated user id');
    }

    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      patissiereId: userId,
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
        data: null,
      };
    }

    if (order.status !== OrderStatus.PENDING) {
      return {
        success: true,
        message: 'Order already processed',
        data: await this.mapOrderDocument(order as any),
      };
    }

    order.status = OrderStatus.ACCEPTED;
    await order.save();

    await this.orderStatusHistoryModel.create({
      orderId: order._id,
      status: OrderStatus.ACCEPTED,
      changedAt: new Date(),
    });

    return {
      success: true,
      message: 'Order accepted successfully',
      data: await this.mapOrderDocument(order as any),
    };
  }

  async completeOrder(orderId: string, userId: string) {
    if (!orderId) {
      throw new BadRequestException('Missing order id');
    }
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order id');
    }
    if (!userId) {
      throw new BadRequestException('Missing authenticated user id');
    }

    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      patissiereId: userId,
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
        data: null,
      };
    }

    // Only allow completing from preparing state to avoid skipping steps.
    if (order.status !== OrderStatus.PREPARING) {
      return {
        success: true,
        message: 'Order already completed or in a later state',
        data: await this.mapOrderDocument(order as any),
      };
    }

    order.status = OrderStatus.COMPLETED;
    await order.save();

    await this.orderStatusHistoryModel.create({
      orderId: order._id,
      status: OrderStatus.COMPLETED,
      changedAt: new Date(),
    });

    this.emitOrderStatusChanged(String(order._id), OrderStatus.COMPLETED);

    return {
      success: true,
      message: 'Order marked as completed successfully',
      data: await this.mapOrderDocument(order as any),
    };
  }

  async findOne(orderId: string, userId: string, role: string) {
    if (!orderId) {
      throw new BadRequestException('Missing order id');
    }
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order id');
    }
    if (!userId) {
      throw new BadRequestException('Missing authenticated user id');
    }

    const accessFilter = this.buildOrderFilterByRole(userId, role);
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      ...accessFilter,
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Order fetched successfully',
      data: await this.mapOrderDocument(order as any),
    };
  }

  async markPaymentCompleted(orderId: string, clientId: string) {
    if (!orderId) {
      throw new BadRequestException('Missing order id');
    }
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order id');
    }
    if (!clientId) {
      throw new BadRequestException('Missing client id');
    }

    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      clientId,
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
        data: null,
      };
    }

    // Idempotent: if payment already reflected in later states, keep current state.
    if (
      order.status === OrderStatus.PREPARING ||
      order.status === OrderStatus.DELIVERING ||
      order.status === OrderStatus.DELIVERED
    ) {
      return {
        success: true,
        message: 'Order already updated after payment',
        data: await this.mapOrderDocument(order as any),
      };
    }

    order.status = OrderStatus.PREPARING;
    await order.save();

    await this.orderStatusHistoryModel.create({
      orderId: order._id,
      status: OrderStatus.PREPARING,
      changedAt: new Date(),
    });

    this.emitOrderStatusChanged(String(order._id), OrderStatus.PREPARING);

    return {
      success: true,
      message: 'Order payment marked successfully',
      data: await this.mapOrderDocument(order as any),
    };
  }

  async remove(orderId: string) {
    this.logger.warn(`OrderService.remove: not implemented yet for MongoDB (orderId=${orderId})`);
    return;
  }
}
