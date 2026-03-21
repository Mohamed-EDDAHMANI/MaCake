import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { Rating, RatingDocument } from './schemas/rating.schema';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ServiceError } from '../../common/exceptions';
import { successPayload } from '../../common/types/response-helpers';

@Injectable()
export class RatingService implements OnModuleInit {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    @InjectModel(Rating.name) private readonly ratingModel: Model<RatingDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      await this.ratingModel.collection.dropIndex('fromUserId_1_productId_1');
      this.logger.log('Dropped old rating index fromUserId_1_productId_1');
    } catch (err: any) {
      if (err?.code === 27 || err?.message?.includes('index not found')) {
        this.logger.log('Rating index fromUserId_1_productId_1 already dropped or missing');
      } else {
        this.logger.warn(`Could not drop rating index: ${err?.message ?? err}`);
      }
    }
    try {
      await this.ratingModel.syncIndexes();
      this.logger.log('Rating indexes synced (partial unique on productId)');
    } catch (err: any) {
      this.logger.warn(`Could not sync rating indexes: ${err?.message ?? err}`);
    }
  }

  /**
   * Emit real-time event to gateway when a rating is created (clients refetch average/count).
   */
  private emitRatingCreated(payload: { toUserId: string; productId: string | null; orderId: string | null }) {
    try {
      const baseUrl =
        this.configService.get<string>('GATEWAY_WS_URL') ||
        'http://gateway:3000/ratings';
      const socket = io(baseUrl, { transports: ['websocket'] });
      socket.emit('rating.created', payload);
      setTimeout(() => socket.disconnect(), 500);
    } catch (err: any) {
      this.logger.warn(`Failed to emit rating.created: ${err?.message ?? 'unknown'}`);
    }
  }

  /**
   * Create a rating. Supports three cases:
   * - Product: productId set → one rating per (fromUserId, productId)
   * - Delivery: orderId + toUserId (delivery) → one per (fromUserId, toUserId, orderId)
   * - Patissiere: orderId + toUserId (patissiere) → one per (fromUserId, toUserId, orderId)
   */
  async create(dto: CreateRatingDto) {
    try {
      if (!dto.orderId && !dto.productId) {
        return new ServiceError('VALIDATION_ERROR', 'Either orderId or productId is required', 400);
      }

      const existing = dto.orderId
        ? await this.ratingModel.findOne({ fromUserId: dto.fromUserId, toUserId: dto.toUserId, orderId: dto.orderId })
        : await this.ratingModel.findOne({ fromUserId: dto.fromUserId, productId: dto.productId ?? null });

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

      this.emitRatingCreated({
        toUserId: dto.toUserId,
        productId: dto.productId ?? null,
        orderId: dto.orderId ?? null,
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

  async checkByOrder(fromUserId: string, orderId: string) {
    try {
      const exists = await this.ratingModel.exists({ fromUserId, orderId });
      return successPayload('Rating check complete', { hasRated: !!exists });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to check rating', 500);
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
