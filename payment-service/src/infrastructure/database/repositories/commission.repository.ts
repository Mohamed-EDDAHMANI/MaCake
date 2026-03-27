import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Commission } from '../../../domain/entities/commission.entity';
import type { ICommissionRepository } from '../../../domain/repositories/commission.repository.interface';
import { CommissionDocument } from '../mongoose/schemas/commission.schema';

@Injectable()
export class CommissionRepository implements ICommissionRepository {
  constructor(
    @InjectModel('Commission') private readonly commissionModel: Model<CommissionDocument>,
  ) {}

  async create(data: { type: 'order' | 'delivery'; percentage: number }): Promise<Commission> {
    const doc = await this.commissionModel.create({
      type: data.type,
      percentage: data.percentage,
    });

    return Commission.reconstitute({ id: doc._id.toString(), type: doc.type, percentage: doc.percentage });
  }
}
