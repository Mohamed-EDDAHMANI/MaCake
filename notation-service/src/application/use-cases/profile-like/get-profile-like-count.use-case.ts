import { Injectable, Inject } from '@nestjs/common';
import { PROFILE_LIKE_REPOSITORY } from '../../../domain/repositories/profile-like.repository.interface';
import type { IProfileLikeRepository } from '../../../domain/repositories/profile-like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetProfileLikeCountUseCase {
  constructor(
    @Inject(PROFILE_LIKE_REPOSITORY) private readonly profileLikeRepository: IProfileLikeRepository,
  ) {}

  async execute(patissiereId: string) {
    try {
      const count = await this.profileLikeRepository.countByPatissiere(patissiereId);
      return successPayload('Profile like count fetched', { patissiereId, count });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get profile like count',
        500,
      );
    }
  }
}
