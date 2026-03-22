import { Injectable, Inject, Logger } from '@nestjs/common';
import { LIKE_REPOSITORY } from '../../../domain/repositories/like.repository.interface';
import type { ILikeRepository } from '../../../domain/repositories/like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetBatchLikerIdsUseCase {
  private readonly logger = new Logger(GetBatchLikerIdsUseCase.name);

  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likeRepository: ILikeRepository,
  ) {}

  async execute(productIds: string[]) {
    try {
      if (!productIds || productIds.length === 0) {
        return successPayload('No product IDs provided', { likerIds: {} });
      }

      const likerIds = await this.likeRepository.findLikerIdsByProducts(productIds);
      return successPayload('Batch liker IDs fetched', { likerIds });
    } catch (error: any) {
      this.logger.error(`Failed to get batch liker IDs: ${error?.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get batch liker IDs',
        500,
      );
    }
  }
}
