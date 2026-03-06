import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Follower, FollowerDocument } from './schemas/follower.schema';
import { ServiceError } from '../../common/exceptions';
import { successPayload } from '../../common/types/response-helpers';

@Injectable()
export class FollowerService {
  private readonly logger = new Logger(FollowerService.name);

  constructor(
    @InjectModel(Follower.name) private readonly followerModel: Model<FollowerDocument>,
  ) {}

  async toggle(clientId: string, patissiereId: string) {
    try {
      if (clientId === patissiereId) {
        return new ServiceError('VALIDATION_ERROR', 'You cannot follow yourself', 400);
      }

      const existing = await this.followerModel.findOne({ clientId, patissiereId }).exec();

      if (existing) {
        await this.followerModel.deleteOne({ _id: existing._id }).exec();
        const count = await this.followerModel.countDocuments({ patissiereId }).exec();
        return successPayload('Unfollowed successfully', { following: false, count });
      }

      await this.followerModel.create({ clientId, patissiereId });
      const count = await this.followerModel.countDocuments({ patissiereId }).exec();
      return successPayload('Followed successfully', { following: true, count });
    } catch (error) {
      this.logger.error(`Failed to toggle follower: ${error?.message}`);
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to toggle follower', 500);
    }
  }

  async getFollowers(patissiereId: string) {
    try {
      const followers = await this.followerModel.find({ patissiereId }).sort({ createdAt: -1 }).exec();
      const clientIds = followers.map(f => f.clientId);
      return successPayload('Followers fetched', { clientIds, count: clientIds.length });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to fetch followers', 500);
    }
  }

  async getCount(patissiereId: string) {
    try {
      const count = await this.followerModel.countDocuments({ patissiereId }).exec();
      return successPayload('Follower count fetched', { patissiereId, count });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to get follower count', 500);
    }
  }

  async isFollowing(clientId: string, patissiereId: string) {
    try {
      const exists = await this.followerModel.exists({ clientId, patissiereId }).exec();
      return successPayload('Follow check result', { following: !!exists });
    } catch (error) {
      return new ServiceError('INTERNAL_SERVER_ERROR', error?.message || 'Failed to check follow', 500);
    }
  }
}
