import { Injectable, Inject } from '@nestjs/common';
import { FOLLOWER_REPOSITORY } from '../../../domain/repositories/follower.repository.interface';
import type { IFollowerRepository } from '../../../domain/repositories/follower.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetFollowersUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY) private readonly followerRepository: IFollowerRepository,
  ) {}

  async execute(patissiereId: string) {
    try {
      const followers = await this.followerRepository.findByPatissiere(patissiereId);
      const clientIds = followers.map((f) => f.clientId);
      return successPayload('Followers fetched', { clientIds, count: clientIds.length });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to fetch followers',
        500,
      );
    }
  }
}
