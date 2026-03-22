import { ProfileLike } from '../entities/profile-like.entity';

export const PROFILE_LIKE_REPOSITORY = Symbol('PROFILE_LIKE_REPOSITORY');

export interface IProfileLikeRepository {
  findOne(userId: string, patissiereId: string): Promise<ProfileLike | null>;
  create(data: { userId: string; patissiereId: string }): Promise<ProfileLike>;
  delete(userId: string, patissiereId: string): Promise<boolean>;
  countByPatissiere(patissiereId: string): Promise<number>;
}
