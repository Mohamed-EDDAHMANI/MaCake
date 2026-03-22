import { Injectable, Inject } from '@nestjs/common';
import { LIKE_REPOSITORY } from '../../../domain/repositories/like.repository.interface';
import type { ILikeRepository } from '../../../domain/repositories/like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class GetLikeCountUseCase {
  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likeRepository: ILikeRepository,
  ) {}

  async execute(productId: string) {
    try {
      const count = await this.likeRepository.countByProduct(productId);
      return successPayload('Like count fetched', { productId, count });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get like count',
        500,
      );
    }
  }
}
