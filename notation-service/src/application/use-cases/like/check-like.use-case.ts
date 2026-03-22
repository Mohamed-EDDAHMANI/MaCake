import { Injectable, Inject } from '@nestjs/common';
import { LIKE_REPOSITORY } from '../../../domain/repositories/like.repository.interface';
import type { ILikeRepository } from '../../../domain/repositories/like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class CheckLikeUseCase {
  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likeRepository: ILikeRepository,
  ) {}

  async execute(userId: string, productId: string) {
    try {
      const like = await this.likeRepository.findOne(userId, productId);
      return successPayload('Like check result', { liked: !!like });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to check like',
        500,
      );
    }
  }
}
