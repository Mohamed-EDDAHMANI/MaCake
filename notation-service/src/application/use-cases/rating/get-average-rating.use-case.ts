import { Injectable, Inject } from '@nestjs/common';
import { RATING_REPOSITORY } from '../../../domain/repositories/rating.repository.interface';
import type { IRatingRepository } from '../../../domain/repositories/rating.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetAverageRatingUseCase {
  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratingRepository: IRatingRepository,
  ) {}

  async execute(userId: string) {
    try {
      const { average, count } = await this.ratingRepository.getAverageForUser(userId);
      return successPayload('Average rating fetched', { average, count });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get average',
        500,
      );
    }
  }
}
