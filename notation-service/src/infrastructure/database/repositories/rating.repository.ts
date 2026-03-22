import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IRatingRepository } from '../../../domain/repositories/rating.repository.interface';
import { Rating as RatingEntity } from '../../../domain/entities/rating.entity';
import { Rating, RatingDocument } from '../mongoose/schemas/rating.schema';

@Injectable()
export class RatingRepository implements IRatingRepository {
  constructor(
    @InjectModel(Rating.name) private readonly ratingModel: Model<RatingDocument>,
  ) {}

  private toDomain(doc: RatingDocument): RatingEntity {
    return RatingEntity.reconstitute({
      id: (doc._id as any).toString(),
      fromUserId: doc.fromUserId,
      toUserId: doc.toUserId,
      orderId: doc.orderId,
      productId: doc.productId,
      stars: doc.stars,
      comment: doc.comment,
      createdAt: (doc as any).createdAt,
    });
  }

  async create(data: {
    fromUserId: string;
    toUserId: string;
    orderId?: string | null;
    productId?: string | null;
    stars: number;
    comment?: string;
  }): Promise<RatingEntity> {
    const doc = await this.ratingModel.create(data);
    return this.toDomain(doc);
  }

  async findByUser(userId: string): Promise<RatingEntity[]> {
    const docs = await this.ratingModel.find({ toUserId: userId }).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toDomain(d));
  }

  async findByProduct(productId: string): Promise<RatingEntity[]> {
    const docs = await this.ratingModel.find({ productId }).sort({ createdAt: -1 }).exec();
    return docs.map((d) => this.toDomain(d));
  }

  async findOne(filter: {
    fromUserId?: string;
    toUserId?: string;
    orderId?: string;
    productId?: string;
  }): Promise<RatingEntity | null> {
    const doc = await this.ratingModel.findOne(filter).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async getAverageForUser(userId: string): Promise<{ average: number; count: number }> {
    const result = await this.ratingModel
      .aggregate([
        { $match: { toUserId: userId } },
        { $group: { _id: null, average: { $avg: '$stars' }, count: { $sum: 1 } } },
      ])
      .exec();

    if (result.length === 0) return { average: 0, count: 0 };
    return {
      average: Math.round(result[0].average * 10) / 10,
      count: result[0].count,
    };
  }

  async getAverageForUsers(
    userIds: string[],
  ): Promise<Record<string, { average: number; count: number }>> {
    if (!userIds || userIds.length === 0) return {};

    const results = await this.ratingModel
      .aggregate([
        { $match: { toUserId: { $in: userIds } } },
        { $group: { _id: '$toUserId', average: { $avg: '$stars' }, count: { $sum: 1 } } },
      ])
      .exec();

    const ratingsMap: Record<string, { average: number; count: number }> = {};
    for (const r of results) {
      ratingsMap[r._id] = {
        average: Math.round(r.average * 10) / 10,
        count: r.count,
      };
    }
    return ratingsMap;
  }

  async existsByOrder(fromUserId: string, orderId: string): Promise<boolean> {
    const exists = await this.ratingModel.exists({ fromUserId, orderId });
    return !!exists;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.ratingModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}
