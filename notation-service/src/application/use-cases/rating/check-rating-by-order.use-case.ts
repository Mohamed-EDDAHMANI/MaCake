import { Injectable, Inject } from '@nestjs/common';
import { RATING_REPOSITORY } from '../../../domain/repositories/rating.repository.interface';
import type { IRatingRepository } from '../../../domain/repositories/rating.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class CheckRatingByOrderUseCase {
  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratingRepository: IRatingRepository,
  ) {}

  async execute(fromUserId: string, orderId: string) {
    try {
      const hasRated = await this.ratingRepository.existsByOrder(fromUserId, orderId);
      return successPayload('Rating check complete', { hasRated });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to check rating',
        500,
      );
    }
  }
}
