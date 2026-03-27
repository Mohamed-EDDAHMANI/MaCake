import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment } from '../../../domain/entities/payment.entity';
import type { IPaymentRepository } from '../../../domain/repositories/payment.repository.interface';
import { PaymentDocument } from '../mongoose/schemas/payment.schema';

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(
    @InjectModel('Payment') private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(data: {
    orderId?: string;
    estimationId?: string;
    clientId: string;
    amount: number;
    paymentMethod: 'stripe_card' | 'wallet';
    status: 'blocked' | 'released' | 'refunded';
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    stripeCustomerId?: string;
  }): Promise<Payment> {
    const doc = await this.paymentModel.create({
      orderId: data.orderId ? new Types.ObjectId(data.orderId) : null,
      estimationId: data.estimationId ? new Types.ObjectId(data.estimationId) : null,
      clientId: new Types.ObjectId(data.clientId),
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      status: data.status,
      stripePaymentIntentId: data.stripePaymentIntentId ?? null,
      stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? null,
      stripeCustomerId: data.stripeCustomerId ?? null,
    });

    return this.toDomain(doc);
  }

  async findByStripeCheckoutSessionId(sessionId: string): Promise<Payment | null> {
    const doc = await this.paymentModel.findOne({ stripeCheckoutSessionId: sessionId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByStripePaymentIntentId(paymentIntentId: string): Promise<Payment | null> {
    const doc = await this.paymentModel.findOne({ stripePaymentIntentId: paymentIntentId }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async updateById(
    paymentId: string,
    data: {
      status?: 'blocked' | 'released' | 'refunded';
      stripePaymentIntentId?: string;
    },
  ): Promise<Payment | null> {
    const doc = await this.paymentModel
      .findByIdAndUpdate(
        paymentId,
        {
          ...(data.status ? { status: data.status } : {}),
          ...(data.stripePaymentIntentId ? { stripePaymentIntentId: data.stripePaymentIntentId } : {}),
        },
        { new: true },
      )
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  private toDomain(doc: PaymentDocument): Payment {
    const raw = doc.toObject() as any;
    return Payment.reconstitute({
      id: doc._id.toString(),
      orderId: raw.orderId?.toString() ?? null,
      estimationId: raw.estimationId?.toString() ?? null,
      clientId: raw.clientId?.toString(),
      amount: raw.amount,
      paymentMethod: raw.paymentMethod,
      status: raw.status,
      stripePaymentIntentId: raw.stripePaymentIntentId ?? undefined,
      stripeCheckoutSessionId: raw.stripeCheckoutSessionId ?? undefined,
      stripeCustomerId: raw.stripeCustomerId ?? undefined,
      createdAt: raw.createdAt,
    });
  }
}
