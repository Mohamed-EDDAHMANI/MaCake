import { Injectable, Inject } from '@nestjs/common';
import { LIKE_REPOSITORY } from '../../../domain/repositories/like.repository.interface';
import type { ILikeRepository } from '../../../domain/repositories/like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class FindLikesByUserUseCase {
  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likeRepository: ILikeRepository,
  ) {}

  async execute(userId: string) {
    try {
      const likes = await this.likeRepository.findByUser(userId);
      const productIds = likes.map((l) => l.productId);
      return successPayload('User likes fetched', { productIds, count: productIds.length });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to fetch likes',
        500,
      );
    }
  }
}
