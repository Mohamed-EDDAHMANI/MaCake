import { Injectable, Inject } from '@nestjs/common';
import { FOLLOWER_REPOSITORY } from '../../../domain/repositories/follower.repository.interface';
import type { IFollowerRepository } from '../../../domain/repositories/follower.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetFollowerCountUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY) private readonly followerRepository: IFollowerRepository,
  ) {}

  async execute(patissiereId: string) {
    try {
      const count = await this.followerRepository.countByPatissiere(patissiereId);
      return successPayload('Follower count fetched', { patissiereId, count });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get follower count',
        500,
      );
    }
  }
}
