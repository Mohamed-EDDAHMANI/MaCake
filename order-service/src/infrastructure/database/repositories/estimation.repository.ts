import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { Estimation, EstimationStatus, EstimationUserRole } from '../../../domain/entities/estimation.entity';
import {
  Estimation as EstimationSchema,
  EstimationDocument,
  EstimationUserRole as SchemaEstimationUserRole,
  EstimationStatus as SchemaEstimationStatus,
} from '../schemas/estimation.schema';

@Injectable()
export class EstimationRepository implements IEstimationRepository {
  constructor(
    @InjectModel(EstimationSchema.name)
    private readonly estimationModel: Model<EstimationDocument>,
  ) {}

  private toDomain(doc: any): Estimation {
    return Estimation.reconstitute({
      id: String(doc._id ?? doc.id),
      orderId: String(doc.orderId),
      details: doc.details,
      price: doc.price,
      userRole: doc.userRole as EstimationUserRole,
      createdBy: doc.createdBy ?? null,
      acceptedBy: doc.acceptedBy ?? null,
      paidAt: doc.paidAt ?? null,
      status: doc.status as EstimationStatus,
      createdAt: doc.createdAt,
    });
  }

  async create(data: {
    orderId: string;
    details: string;
    price: number;
    userRole?: string;
    createdBy?: string | null;
  }): Promise<Estimation> {
    const doc = await this.estimationModel.create({
      orderId: new Types.ObjectId(data.orderId),
      details: data.details,
      price: data.price,
      userRole: data.userRole ?? SchemaEstimationUserRole.CLIENT,
      status: SchemaEstimationStatus.PENDING,
      createdBy: data.createdBy ?? null,
    });
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Estimation | null> {
    if (!id || !Types.ObjectId.isValid(id)) return null;
    const doc = await this.estimationModel.findById(id).lean().exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findByOrderId(orderId: string): Promise<Estimation[]> {
    if (!orderId || !Types.ObjectId.isValid(orderId)) return [];
    const docs = await this.estimationModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
    return docs.map((d) => this.toDomain(d));
  }

  async findPendingForDelivery(excludeUserId?: string): Promise<any[]> {
    return this.estimationModel
      .find({
        userRole: SchemaEstimationUserRole.CLIENT,
        status: SchemaEstimationStatus.PENDING,
      })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async findAcceptedByDelivery(deliveryId: string): Promise<any[]> {
    return this.estimationModel
      .find({
        status: SchemaEstimationStatus.CONFIRMED,
        $or: [
          { userRole: SchemaEstimationUserRole.DELIVERY, createdBy: deliveryId },
          { userRole: SchemaEstimationUserRole.CLIENT, acceptedBy: deliveryId },
        ],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findEstimatedByDelivery(deliveryId: string): Promise<any[]> {
    return this.estimationModel
      .find({
        userRole: SchemaEstimationUserRole.DELIVERY,
        status: SchemaEstimationStatus.PENDING,
        createdBy: deliveryId,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findDeliveredByDelivery(deliveryId: string): Promise<any[]> {
    return this.estimationModel
      .find({
        status: SchemaEstimationStatus.CONFIRMED,
        $or: [
          { userRole: SchemaEstimationUserRole.DELIVERY, createdBy: deliveryId },
          { userRole: SchemaEstimationUserRole.CLIENT, acceptedBy: deliveryId },
        ],
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async update(
    id: string,
    data: Partial<{ status: string; acceptedBy: string | null; paidAt: Date }>,
  ): Promise<Estimation | null> {
    if (!id || !Types.ObjectId.isValid(id)) return null;
    const doc = await this.estimationModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findRawById(id: string): Promise<any | null> {
    if (!id || !Types.ObjectId.isValid(id)) return null;
    return this.estimationModel.findById(id).exec();
  }

  async findRawByOrderIdAndRole(orderId: string, userRole: string): Promise<any | null> {
    if (!orderId || !Types.ObjectId.isValid(orderId)) return null;
    return this.estimationModel
      .findOne({ orderId: new Types.ObjectId(orderId), userRole })
      .exec();
  }

  async saveRaw(doc: any): Promise<void> {
    await doc.save();
  }
}
