import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IFollowerRepository } from '../../../domain/repositories/follower.repository.interface';
import { Follower as FollowerEntity } from '../../../domain/entities/follower.entity';
import { Follower, FollowerDocument } from '../mongoose/schemas/follower.schema';

@Injectable()
export class FollowerRepository implements IFollowerRepository {
  constructor(
    @InjectModel(Follower.name) private readonly followerModel: Model<FollowerDocument>,
  ) {}

  private toDomain(doc: FollowerDocument): FollowerEntity {
    return FollowerEntity.reconstitute({
      id: (doc._id as any).toString(),
      clientId: doc.clientId,
      patissiereId: doc.patissiereId,
      createdAt: (doc as any).createdAt,
    });
  }

  async findOne(clientId: string, patissiereId: string): Promise<FollowerEntity | null> {
    const doc = await this.followerModel.findOne({ clientId, patissiereId }).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async create(data: { clientId: string; patissiereId: string }): Promise<FollowerEntity> {
    const doc = await this.followerModel.create(data);
    return this.toDomain(doc);
  }

  async delete(clientId: string, patissiereId: string): Promise<boolean> {
    const result = await this.followerModel.deleteOne({ clientId, patissiereId }).exec();
    return result.deletedCount > 0;
  }

  async findByPatissiere(patissiereId: string): Promise<FollowerEntity[]> {
    const docs = await this.followerModel.find({ patissiereId }).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toDomain(d));
  }

  async countByPatissiere(patissiereId: string): Promise<number> {
    return this.followerModel.countDocuments({ patissiereId }).exec();
  }
}
