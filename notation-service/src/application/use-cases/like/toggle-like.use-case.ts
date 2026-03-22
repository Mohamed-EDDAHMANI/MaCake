import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LIKE_REPOSITORY } from '../../../domain/repositories/like.repository.interface';
import type { ILikeRepository } from '../../../domain/repositories/like.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';
import { CATALOG_CLIENT, NOTATION_EVENTS } from '../../../messaging/constants';

@Injectable()
export class ToggleLikeUseCase {
  private readonly logger = new Logger(ToggleLikeUseCase.name);

  constructor(
    @Inject(LIKE_REPOSITORY) private readonly likeRepository: ILikeRepository,
    @Inject(CATALOG_CLIENT) private readonly catalogClient: ClientProxy,
  ) {}

  async execute(userId: string, productId: string) {
    try {
      const existing = await this.likeRepository.findOne(userId, productId);

      if (existing) {
        await this.likeRepository.delete(userId, productId);
        const count = await this.likeRepository.countByProduct(productId);
        this.catalogClient.emit(NOTATION_EVENTS.LIKE_TOGGLED, { productId, likesCount: count });
        return successPayload('Like removed', { liked: false, count });
      }

      await this.likeRepository.create({ userId, productId });
      const count = await this.likeRepository.countByProduct(productId);
      this.catalogClient.emit(NOTATION_EVENTS.LIKE_TOGGLED, { productId, likesCount: count });
      return successPayload('Like added', { liked: true, count });
    } catch (error: any) {
      this.logger.error(`Failed to toggle like: ${error?.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to toggle like',
        500,
      );
    }
  }
}
