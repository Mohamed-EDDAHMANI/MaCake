import { Injectable, Inject } from '@nestjs/common';
import { RATING_REPOSITORY } from '../../../domain/repositories/rating.repository.interface';
import type { IRatingRepository } from '../../../domain/repositories/rating.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class DeleteRatingUseCase {
  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratingRepository: IRatingRepository,
  ) {}

  async execute(ratingId: string) {
    try {
      const deleted = await this.ratingRepository.delete(ratingId);
      if (!deleted) {
        return new ServiceError('NOT_FOUND', 'Rating not found', 404);
      }
      return successPayload('Rating deleted successfully', null);
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to delete rating',
        500,
      );
    }
  }
}
