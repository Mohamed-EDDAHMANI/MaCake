import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Transaction } from '../../../domain/entities/transaction.entity';
import type { ITransactionRepository } from '../../../domain/repositories/transaction.repository.interface';
import { TransactionDocument } from '../mongoose/schemas/transaction.schema';

@Injectable()
export class TransactionRepository implements ITransactionRepository {
  constructor(
    @InjectModel('Transaction') private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async create(data: {
    userId?: string;
    type: 'earning' | 'commission';
    amount: number;
    relatedOrderId?: string;
    stripeChargeId?: string;
    stripeAccountId?: string;
  }): Promise<Transaction> {
    const isMongoObjectId = (value?: string) => typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value.trim());

    const doc = await this.transactionModel.create({
      userId: data.userId && isMongoObjectId(data.userId) ? new Types.ObjectId(data.userId) : null,
      type: data.type,
      amount: data.amount,
      relatedOrderId: data.relatedOrderId ? new Types.ObjectId(data.relatedOrderId) : null,
      stripeChargeId: data.stripeChargeId ?? null,
      stripeAccountId: data.stripeAccountId ?? null,
    });

    return this.toDomain(doc);
  }

  private toDomain(doc: TransactionDocument): Transaction {
    const raw = doc.toObject() as any;
    return Transaction.reconstitute({
      id: doc._id.toString(),
      type: raw.type,
      amount: raw.amount,
      userId: raw.userId?.toString() ?? undefined,
      relatedOrderId: raw.relatedOrderId?.toString() ?? undefined,
      stripeChargeId: raw.stripeChargeId ?? undefined,
      stripeAccountId: raw.stripeAccountId ?? undefined,
      createdAt: raw.createdAt,
    });
  }
}
