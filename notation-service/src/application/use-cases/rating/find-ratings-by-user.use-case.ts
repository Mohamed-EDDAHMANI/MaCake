import { Injectable, Inject } from '@nestjs/common';
import { RATING_REPOSITORY } from '../../../domain/repositories/rating.repository.interface';
import type { IRatingRepository } from '../../../domain/repositories/rating.repository.interface';
import { RatingMapper } from '../../mappers/rating.mapper';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class FindRatingsByUserUseCase {
  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratingRepository: IRatingRepository,
  ) {}

  async execute(userId: string) {
    try {
      const ratings = await this.ratingRepository.findByUser(userId);
      return successPayload('Ratings fetched successfully', {
        ratings: RatingMapper.toDtoList(ratings),
        count: ratings.length,
      });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to fetch ratings',
        500,
      );
    }
  }
}
