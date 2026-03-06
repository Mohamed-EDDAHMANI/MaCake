import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rating, RatingDocument } from './schemas/rating.schema';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ServiceError } from '../../common/exceptions';
import { successPayload } from '../../common/types/response-helpers';

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @InjectModel(Rating.name) private readonly ratingModel: Model<RatingDocument>,
  ) {}

  async create(dto: CreateRatingDto) {
    try {
      if (!dto.orderId && !dto.productId) {
        return new ServiceError('VALIDATION_ERROR', 'Either orderId or productId is required', 400);
      }

      const existing = dto.orderId
        ? await this.ratingModel.findOne({ fromUserId: dto.fromUserId, toUserId: dto.toUserId, orderId: dto.orderId })
        : await this.ratingModel.findOne({ fromUserId: dto.fromUserId, productId: dto.productId });

      if (existing) {
        return new ServiceError('CONFLICT', 'You have already rated this', 409);
      }

      const rating = await this.ratingModel.create({
        fromUserId: dto.fromUserId,
        toUserId: dto.toUserId,
        orderId: dto.orderId ?? null,
        productId: dto.productId ?? null,
        stars: dto.stars,
        comment: dto.comment ?? null,
      });

      return successPayload('Rating created successfully', { rating }, 201);
    } catch (error) {
      this.logger.error(`Failed to create rating: ${error?.message}`);
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to create rating', 500);
    }
  }

  async findByUser(userId: string) {
    try {
      const ratings = await this.ratingModel.find({ toUserId: userId }).sort({ createdAt: -1 }).exec();
      return successPayload('Ratings fetched successfully', { ratings, count: ratings.length });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to fetch ratings', 500);
    }
  }

  async findByProduct(productId: string) {
    try {
      const ratings = await this.ratingModel.find({ productId }).sort({ createdAt: -1 }).exec();
      return successPayload('Product ratings fetched successfully', { ratings, count: ratings.length });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to fetch ratings', 500);
    }
  }

  async getAverage(userId: string) {
    try {
      const result = await this.ratingModel.aggregate([
        { $match: { toUserId: userId } },
        { $group: { _id: null, average: { $avg: '$stars' }, count: { $sum: 1 } } },
      ]).exec();

      const average = result.length > 0 ? Math.round(result[0].average * 10) / 10 : 0;
      const count = result.length > 0 ? result[0].count : 0;

      return successPayload('Average rating fetched', { average, count });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to get average', 500);
    }
  }

  /**
   * Batch-fetch average ratings for multiple users at once.
   * Returns a map of { [userId]: { average, count } }.
   */
  async getAverageForUsers(userIds: string[]) {
    try {
      if (!userIds || userIds.length === 0) {
        return successPayload('No user IDs provided', { ratings: {} });
      }

      const results = await this.ratingModel.aggregate([
        { $match: { toUserId: { $in: userIds } } },
        { $group: { _id: '$toUserId', average: { $avg: '$stars' }, count: { $sum: 1 } } },
      ]).exec();

      const ratingsMap: Record<string, { average: number; count: number }> = {};
      for (const r of results) {
        ratingsMap[r._id] = {
          average: Math.round(r.average * 10) / 10,
          count: r.count,
        };
      }

      return successPayload('Batch average ratings fetched', { ratings: ratingsMap });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to get batch averages', 500);
    }
  }

  async delete(ratingId: string) {
    try {
      const rating = await this.ratingModel.findByIdAndDelete(ratingId).exec();
      if (!rating) {
        return new ServiceError('NOT_FOUND', 'Rating not found', 404);
      }
      return successPayload('Rating deleted successfully', null);
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to delete rating', 500);
    }
  }
}
