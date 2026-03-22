import { Injectable, Inject } from '@nestjs/common';
import { FOLLOWER_REPOSITORY } from '../../../domain/repositories/follower.repository.interface';
import type { IFollowerRepository } from '../../../domain/repositories/follower.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class CheckFollowerUseCase {
  constructor(
    @Inject(FOLLOWER_REPOSITORY) private readonly followerRepository: IFollowerRepository,
  ) {}

  async execute(clientId: string, patissiereId: string) {
    try {
      const follower = await this.followerRepository.findOne(clientId, patissiereId);
      return successPayload('Follow check result', { following: !!follower });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to check follow',
        500,
      );
    }
  }
}
