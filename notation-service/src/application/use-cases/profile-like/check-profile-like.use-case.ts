import { Injectable, Inject } from '@nestjs/common';
import { PROFILE_LIKE_REPOSITORY } from '../../../domain/repositories/profile-like.repository.interface';
import type { IProfileLikeRepository } from '../../../domain/repositories/profile-like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class CheckProfileLikeUseCase {
  constructor(
    @Inject(PROFILE_LIKE_REPOSITORY) private readonly profileLikeRepository: IProfileLikeRepository,
  ) {}

  async execute(userId: string, patissiereId: string) {
    try {
      const profileLike = await this.profileLikeRepository.findOne(userId, patissiereId);
      return successPayload('Profile like check result', { liked: !!profileLike });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to check profile like',
        500,
      );
    }
  }
}
