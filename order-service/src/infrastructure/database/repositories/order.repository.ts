import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { Order } from '../../../domain/entities/order.entity';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';
import {
  Order as OrderSchema,
  OrderDocument,
} from '../schemas/order.schema';
import {
  OrderItem,
  OrderItemDocument,
} from '../schemas/order-item.schema';
import {
  OrderStatusHistory,
  OrderStatusHistoryDocument,
} from '../schemas/order-status-history.schema';

@Injectable()
export class OrderRepository implements IOrderRepository {
  constructor(
    @InjectModel(OrderSchema.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderItem.name) private readonly orderItemModel: Model<OrderItemDocument>,
    @InjectModel(OrderStatusHistory.name)
    private readonly orderStatusHistoryModel: Model<OrderStatusHistoryDocument>,
  ) {}

  private toDomain(doc: any): Order {
    return Order.reconstitute({
      id: String(doc._id ?? doc.id),
      clientId: doc.clientId,
      patissiereId: doc.patissiereId,
      deliveryAddress: doc.deliveryAddress,
      patissiereAddress: doc.patissiereAddress,
      deliveryAddressSource: doc.deliveryAddressSource,
      deliveryLatitude: doc.deliveryLatitude ?? null,
      deliveryLongitude: doc.deliveryLongitude ?? null,
      patissiereLatitude: doc.patissiereLatitude ?? null,
      patissiereLongitude: doc.patissiereLongitude ?? null,
      requestedDateTime: doc.requestedDateTime,
      totalPrice: doc.totalPrice,
      status: doc.status as OrderStatus,
      createdAt: doc.createdAt,
    });
  }

  private async mapDocWithItems(doc: any): Promise<any> {
    const orderId = String(doc._id ?? doc.id);
    const items = await this.orderItemModel.find({ orderId: new Types.ObjectId(orderId) }).lean().exec();

    return {
      id: orderId,
      clientId: doc.clientId,
      patissiereId: doc.patissiereId,
      patissiereAddress: doc.patissiereAddress,
      deliveryAddress: doc.deliveryAddress,
      deliveryAddressSource: doc.deliveryAddressSource,
      deliveryLatitude: doc.deliveryLatitude ?? null,
      deliveryLongitude: doc.deliveryLongitude ?? null,
      patissiereLatitude: doc.patissiereLatitude ?? null,
      patissiereLongitude: doc.patissiereLongitude ?? null,
      requestedDateTime: doc.requestedDateTime,
      totalPrice: doc.totalPrice,
      status: doc.status,
      items: items.map((it) => ({
        id: String(it._id),
        orderId: String(it.orderId),
        productId: it.productId,
        quantity: it.quantity,
        price: it.price,
        customizationDetails: it.customizationDetails,
      })),
      createdAt: doc.createdAt,
    };
  }

  async create(data: {
    clientId: string;
    patissiereId: string;
    deliveryAddress: string;
    patissiereAddress: string;
    deliveryAddressSource?: 'profile' | 'current_location';
    deliveryLatitude?: number | null;
    deliveryLongitude?: number | null;
    patissiereLatitude?: number | null;
    patissiereLongitude?: number | null;
    requestedDateTime?: Date;
    totalPrice: number;
    items?: any[];
  }): Promise<Order> {
    const order = await this.orderModel.create({
      clientId: data.clientId,
      patissiereId: data.patissiereId,
      patissiereAddress: data.patissiereAddress,
      deliveryAddress: data.deliveryAddress,
      deliveryAddressSource: data.deliveryAddressSource,
      deliveryLatitude: data.deliveryLatitude ?? null,
      deliveryLongitude: data.deliveryLongitude ?? null,
      patissiereLatitude: data.patissiereLatitude ?? null,
      patissiereLongitude: data.patissiereLongitude ?? null,
      requestedDateTime: data.requestedDateTime,
      totalPrice: data.totalPrice ?? 0,
      status: OrderStatus.PENDING,
    });

    if (data.items && data.items.length > 0) {
      await this.orderItemModel.insertMany(
        data.items.map((item) => ({
          orderId: order._id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.priceAtPurchase ?? item.price,
          customizationDetails: item.customizationDetails,
        })),
      );
    }

    await this.orderStatusHistoryModel.create({
      orderId: order._id,
      status: OrderStatus.PENDING,
      changedAt: new Date(),
    });

    return this.toDomain(order);
  }

  async findById(id: string): Promise<Order | null> {
    if (!id || !Types.ObjectId.isValid(id)) return null;
    const doc = await this.orderModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findByClientId(clientId: string): Promise<Order[]> {
    const docs = await this.orderModel.find({ clientId }).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toDomain(d));
  }

  async findByPatissiereId(patissiereId: string): Promise<Order[]> {
    const docs = await this.orderModel.find({ patissiereId }).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toDomain(d));
  }

  async findMany(filter: {
    clientId?: string;
    patissiereId?: string;
    status?: OrderStatus;
    userId?: string;
    role?: string;
  }): Promise<Order[]> {
    let mongoFilter: any = {};

    if (filter.userId) {
      const normalizedRole = (filter.role || '').toLowerCase();
      if (normalizedRole !== 'delivery' && normalizedRole !== 'livreur') {
        const isPatissiere = normalizedRole === 'patissiere';
        mongoFilter = isPatissiere
          ? { $or: [{ clientId: filter.userId }, { patissiereId: filter.userId }] }
          : { clientId: filter.userId };
      }
    } else {
      if (filter.clientId) mongoFilter.clientId = filter.clientId;
      if (filter.patissiereId) mongoFilter.patissiereId = filter.patissiereId;
    }

    if (filter.status) mongoFilter.status = filter.status;

    const docs = await this.orderModel.find(mongoFilter).sort({ createdAt: -1 }).lean().exec();
    return docs.map((d) => this.toDomain(d));
  }

  async update(id: string, data: Partial<{ status: OrderStatus }>): Promise<Order | null> {
    if (!id || !Types.ObjectId.isValid(id)) return null;
    const doc = await this.orderModel.findByIdAndUpdate(id, { $set: data }, { new: true }).lean().exec();
    if (!doc) return null;

    if (data.status) {
      await this.orderStatusHistoryModel.create({
        orderId: new Types.ObjectId(id),
        status: data.status,
        changedAt: new Date(),
      });
    }

    return this.toDomain(doc);
  }

  async delete(id: string): Promise<boolean> {
    if (!id || !Types.ObjectId.isValid(id)) return false;
    const result = await this.orderModel.deleteOne({ _id: new Types.ObjectId(id) });
    return result.deletedCount > 0;
  }

  async findByIdForInternal(id: string): Promise<{ clientId: string; status: OrderStatus } | null> {
    if (!id || !Types.ObjectId.isValid(id)) return null;
    const doc = await this.orderModel.findById(id).select('clientId status').lean().exec();
    if (!doc) return null;
    return { clientId: (doc as any).clientId, status: (doc as any).status as OrderStatus };
  }

  async findWithItemsById(id: string): Promise<any | null> {
    if (!id || !Types.ObjectId.isValid(id)) return null;
    const doc = await this.orderModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.mapDocWithItems(doc);
  }
}
