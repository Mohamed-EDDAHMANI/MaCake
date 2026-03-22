import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ILikeRepository } from '../../../domain/repositories/like.repository.interface';
import { Like as LikeEntity } from '../../../domain/entities/like.entity';
import { Like, LikeDocument } from '../mongoose/schemas/like.schema';

@Injectable()
export class LikeRepository implements ILikeRepository {
  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
  ) {}

  private toDomain(doc: LikeDocument): LikeEntity {
    return LikeEntity.reconstitute({
      id: (doc._id as any).toString(),
      userId: doc.userId,
      productId: doc.productId,
      createdAt: (doc as any).createdAt,
    });
  }

  async findOne(userId: string, productId: string): Promise<LikeEntity | null> {
    const doc = await this.likeModel.findOne({ userId, productId }).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async create(data: { userId: string; productId: string }): Promise<LikeEntity> {
    const doc = await this.likeModel.create(data);
    return this.toDomain(doc);
  }

  async delete(userId: string, productId: string): Promise<boolean> {
    const result = await this.likeModel.deleteOne({ userId, productId }).exec();
    return result.deletedCount > 0;
  }

  async countByProduct(productId: string): Promise<number> {
    return this.likeModel.countDocuments({ productId }).exec();
  }

  async countByProducts(productIds: string[]): Promise<Record<string, number>> {
    if (!productIds || productIds.length === 0) return {};

    const results = await this.likeModel
      .aggregate([
        { $match: { productId: { $in: productIds } } },
        { $group: { _id: '$productId', count: { $sum: 1 } } },
      ])
      .exec();

    const likesMap: Record<string, number> = {};
    for (const r of results) {
      likesMap[r._id] = r.count;
    }
    return likesMap;
  }

  async findLikerIdsByProducts(productIds: string[]): Promise<Record<string, string[]>> {
    if (!productIds || productIds.length === 0) return {};

    const results = await this.likeModel
      .aggregate([
        { $match: { productId: { $in: productIds } } },
        { $group: { _id: '$productId', userIds: { $push: '$userId' } } },
      ])
      .exec();

    const likerIds: Record<string, string[]> = {};
    for (const r of results) {
      const key = r._id != null ? String(r._id) : '';
      const userIds = Array.isArray(r.userIds) ? r.userIds.map((u: any) => String(u)) : [];
      likerIds[key] = userIds;
    }
    for (const id of productIds) {
      const key = id != null ? String(id) : '';
      if (likerIds[key] == null) likerIds[key] = [];
    }
    return likerIds;
  }

  async findByUser(userId: string): Promise<LikeEntity[]> {
    const docs = await this.likeModel.find({ userId }).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toDomain(d));
  }
}
