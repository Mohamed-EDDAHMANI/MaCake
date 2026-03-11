import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../../infrastructure/database/schemas/order.schema';
import { OrderItem, OrderItemDocument } from '../../infrastructure/database/schemas/order-item.schema';
import {
  OrderStatusHistory,
  OrderStatusHistoryDocument,
} from '../../infrastructure/database/schemas/order-status-history.schema';

@Injectable()
export class OrderService {
  public readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(OrderStatusHistory.name)
    private readonly orderStatusHistoryModel: Model<OrderStatusHistoryDocument>,
  ) { }

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
    this.logger.warn('OrderService.findAll: not implemented yet for MongoDB');
    return [];
  }

  findOne(orderId: string) {
    this.logger.warn(`OrderService.findOne: not implemented yet for MongoDB (orderId=${orderId})`);
    return null;
  }

  async remove(orderId: string) {
    this.logger.warn(`OrderService.remove: not implemented yet for MongoDB (orderId=${orderId})`);
    return;
  }
}
