import { Injectable, Inject } from '@nestjs/common';
import { RATING_REPOSITORY } from '../../../domain/repositories/rating.repository.interface';
import type { IRatingRepository } from '../../../domain/repositories/rating.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetBatchAverageRatingsUseCase {
  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratingRepository: IRatingRepository,
  ) {}

  async execute(userIds: string[]) {
    try {
      if (!userIds || userIds.length === 0) {
        return successPayload('No user IDs provided', { ratings: {} });
      }

      const ratingsMap = await this.ratingRepository.getAverageForUsers(userIds);
      return successPayload('Batch average ratings fetched', { ratings: ratingsMap });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get batch averages',
        500,
      );
    }
  }
}
