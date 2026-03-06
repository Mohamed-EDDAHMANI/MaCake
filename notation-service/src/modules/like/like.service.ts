import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Like, LikeDocument } from './schemas/like.schema';
import { ServiceError } from '../../common/exceptions';
import { successPayload } from '../../common/types/response-helpers';
import { CATALOG_CLIENT, NOTATION_EVENTS } from '../../messaging';

@Injectable()
export class LikeService {
  private readonly logger = new Logger(LikeService.name);

  constructor(
    @InjectModel(Like.name) private readonly likeModel: Model<LikeDocument>,
    @Inject(CATALOG_CLIENT) private readonly catalogClient: ClientProxy,
  ) {}

  async toggle(userId: string, productId: string) {
    try {
      const existing = await this.likeModel.findOne({ userId, productId }).exec();

      if (existing) {
        await this.likeModel.deleteOne({ _id: existing._id }).exec();
        const count = await this.likeModel.countDocuments({ productId }).exec();
        this.catalogClient.emit(NOTATION_EVENTS.LIKE_TOGGLED, { productId, likesCount: count });
        return successPayload('Like removed', { liked: false, count });
      }

      await this.likeModel.create({ userId, productId });
      const count = await this.likeModel.countDocuments({ productId }).exec();
      this.catalogClient.emit(NOTATION_EVENTS.LIKE_TOGGLED, { productId, likesCount: count });
      return successPayload('Like added', { liked: true, count });
    } catch (error) {
      this.logger.error(`Failed to toggle like: ${error?.message}`);
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to toggle like', 500);
    }
  }

  async getCount(productId: string) {
    try {
      const count = await this.likeModel.countDocuments({ productId }).exec();
      return successPayload('Like count fetched', { productId, count });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to get like count', 500);
    }
  }

  /**
   * Batch-fetch like counts for multiple products at once.
   * Returns a map of { [productId]: count }.
   */
  async getBatchCount(productIds: string[]) {
    try {
      if (!productIds || productIds.length === 0) {
        return successPayload('No product IDs provided', { likes: {} });
      }

      const results = await this.likeModel.aggregate([
        { $match: { productId: { $in: productIds } } },
        { $group: { _id: '$productId', count: { $sum: 1 } } },
      ]).exec();

      const likesMap: Record<string, number> = {};
      for (const r of results) {
        likesMap[r._id] = r.count;
      }

      return successPayload('Batch like counts fetched', { likes: likesMap });
    } catch (error) {
      this.logger.error(`Failed to get batch like counts: ${error?.message}`);
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to get batch like counts', 500);
    }
  }

  async hasUserLiked(userId: string, productId: string) {
    try {
      const exists = await this.likeModel.exists({ userId, productId }).exec();
      return successPayload('Like check result', { liked: !!exists });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to check like', 500);
    }
  }

  async findByUser(userId: string) {
    try {
      const likes = await this.likeModel.find({ userId }).sort({ createdAt: -1 }).exec();
      const productIds = likes.map(l => l.productId);
      return successPayload('User likes fetched', { productIds, count: productIds.length });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to fetch likes', 500);
    }
  }

  /**
   * Batch-fetch for each product the list of user IDs who liked it.
   * Returns { likerIds: { [productId]: string[] } }.
   */
  async getBatchLikerIds(productIds: string[]) {
    try {
      if (!productIds || productIds.length === 0) {
        return successPayload('No product IDs provided', { likerIds: {} });
      }

      const results = await this.likeModel.aggregate([
        { $match: { productId: { $in: productIds } } },
        { $group: { _id: '$productId', userIds: { $push: '$userId' } } },
      ]).exec();

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

      return successPayload('Batch liker IDs fetched', { likerIds });
    } catch (error) {
      this.logger.error(`Failed to get batch liker IDs: ${error?.message}`);
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to get batch liker IDs', 500);
    }
  }
}
