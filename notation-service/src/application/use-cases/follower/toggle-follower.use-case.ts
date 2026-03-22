import { Injectable, Inject, Logger } from '@nestjs/common';
import { FOLLOWER_REPOSITORY } from '../../../domain/repositories/follower.repository.interface';
import type { IFollowerRepository } from '../../../domain/repositories/follower.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class ToggleFollowerUseCase {
  private readonly logger = new Logger(ToggleFollowerUseCase.name);

  constructor(
    @Inject(FOLLOWER_REPOSITORY) private readonly followerRepository: IFollowerRepository,
  ) {}

  async execute(clientId: string, patissiereId: string) {
    try {
      if (clientId === patissiereId) {
        return new ServiceError('VALIDATION_ERROR', 'You cannot follow yourself', 400);
      }

      const existing = await this.followerRepository.findOne(clientId, patissiereId);

      if (existing) {
        await this.followerRepository.delete(clientId, patissiereId);
        const count = await this.followerRepository.countByPatissiere(patissiereId);
        return successPayload('Unfollowed successfully', { following: false, count });
      }

      await this.followerRepository.create({ clientId, patissiereId });
      const count = await this.followerRepository.countByPatissiere(patissiereId);
      return successPayload('Followed successfully', { following: true, count });
    } catch (error: any) {
      this.logger.error(`Failed to toggle follower: ${error?.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to toggle follower',
        500,
      );
    }
  }
}
