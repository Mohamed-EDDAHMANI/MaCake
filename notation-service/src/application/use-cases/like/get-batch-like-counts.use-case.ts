import { Injectable, Inject, Logger } from '@nestjs/common';
import { LIKE_REPOSITORY } from '../../../domain/repositories/like.repository.interface';
import type { ILikeRepository } from '../../../domain/repositories/like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetBatchLikeCountsUseCase {
  private readonly logger = new Logger(GetBatchLikeCountsUseCase.name);

  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likeRepository: ILikeRepository,
  ) {}

  async execute(productIds: string[]) {
    try {
      if (!productIds || productIds.length === 0) {
        return successPayload('No product IDs provided', { likes: {} });
      }

      const likesMap = await this.likeRepository.countByProducts(productIds);
      return successPayload('Batch like counts fetched', { likes: likesMap });
    } catch (error: any) {
      this.logger.error(`Failed to get batch like counts: ${error?.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get batch like counts',
        500,
      );
    }
  }
}
