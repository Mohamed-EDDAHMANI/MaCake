import { Injectable, Inject, Logger } from '@nestjs/common';
import { PROFILE_LIKE_REPOSITORY } from '../../../domain/repositories/profile-like.repository.interface';
import type { IProfileLikeRepository } from '../../../domain/repositories/profile-like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class ToggleProfileLikeUseCase {
  private readonly logger = new Logger(ToggleProfileLikeUseCase.name);

  constructor(
    @Inject(PROFILE_LIKE_REPOSITORY) private readonly profileLikeRepository: IProfileLikeRepository,
  ) {}

  async execute(userId: string, patissiereId: string) {
    try {
      if (userId === patissiereId) {
        return new ServiceError('VALIDATION_ERROR', 'You cannot like your own profile', 400);
      }

      const existing = await this.profileLikeRepository.findOne(userId, patissiereId);

      if (existing) {
        await this.profileLikeRepository.delete(userId, patissiereId);
        const count = await this.profileLikeRepository.countByPatissiere(patissiereId);
        return successPayload('Profile unliked', { liked: false, count });
      }

      await this.profileLikeRepository.create({ userId, patissiereId });
      const count = await this.profileLikeRepository.countByPatissiere(patissiereId);
      return successPayload('Profile liked', { liked: true, count });
    } catch (error: any) {
      this.logger.error(`Failed to toggle profile like: ${error?.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to toggle profile like',
        500,
      );
    }
  }
}
