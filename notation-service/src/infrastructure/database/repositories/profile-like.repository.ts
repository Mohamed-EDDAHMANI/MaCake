import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IProfileLikeRepository } from '../../../domain/repositories/profile-like.repository.interface';
import { ProfileLike as ProfileLikeEntity } from '../../../domain/entities/profile-like.entity';
import { ProfileLike, ProfileLikeDocument } from '../mongoose/schemas/profile-like.schema';

@Injectable()
export class ProfileLikeRepository implements IProfileLikeRepository {
  constructor(
    @InjectModel(ProfileLike.name) private readonly profileLikeModel: Model<ProfileLikeDocument>,
  ) {}

  private toDomain(doc: ProfileLikeDocument): ProfileLikeEntity {
    return ProfileLikeEntity.reconstitute({
      id: (doc._id as any).toString(),
      userId: doc.userId,
      patissiereId: doc.patissiereId,
      createdAt: (doc as any).createdAt,
    });
  }

  async findOne(userId: string, patissiereId: string): Promise<ProfileLikeEntity | null> {
    const doc = await this.profileLikeModel.findOne({ userId, patissiereId }).exec();
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async create(data: { userId: string; patissiereId: string }): Promise<ProfileLikeEntity> {
    const doc = await this.profileLikeModel.create(data);
    return this.toDomain(doc);
  }

  async delete(userId: string, patissiereId: string): Promise<boolean> {
    const result = await this.profileLikeModel.deleteOne({ userId, patissiereId }).exec();
    return result.deletedCount > 0;
  }

  async countByPatissiere(patissiereId: string): Promise<number> {
    return this.profileLikeModel.countDocuments({ patissiereId }).exec();
  }
}
