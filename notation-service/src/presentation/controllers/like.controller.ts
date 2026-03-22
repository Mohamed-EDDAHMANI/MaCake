import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { ServiceError } from '../../common/exceptions';
import { NOTATION_PATTERNS } from '../../messaging/constants';
import { ToggleLikeUseCase } from '../../application/use-cases/like/toggle-like.use-case';
import { GetLikeCountUseCase } from '../../application/use-cases/like/get-like-count.use-case';
import { GetBatchLikeCountsUseCase } from '../../application/use-cases/like/get-batch-like-counts.use-case';
import { GetBatchLikerIdsUseCase } from '../../application/use-cases/like/get-batch-liker-ids.use-case';
import { CheckLikeUseCase } from '../../application/use-cases/like/check-like.use-case';
import { FindLikesByUserUseCase } from '../../application/use-cases/like/find-likes-by-user.use-case';

@Controller()
export class LikeController {
  constructor(
    @Inject(ToggleLikeUseCase) private readonly toggleLikeUseCase: ToggleLikeUseCase,
    @Inject(GetLikeCountUseCase) private readonly getLikeCountUseCase: GetLikeCountUseCase,
    @Inject(GetBatchLikeCountsUseCase) private readonly getBatchLikeCountsUseCase: GetBatchLikeCountsUseCase,
    @Inject(GetBatchLikerIdsUseCase) private readonly getBatchLikerIdsUseCase: GetBatchLikerIdsUseCase,
    @Inject(CheckLikeUseCase) private readonly checkLikeUseCase: CheckLikeUseCase,
    @Inject(FindLikesByUserUseCase) private readonly findLikesByUserUseCase: FindLikesByUserUseCase,
  ) {}

  @MessagePattern(NOTATION_PATTERNS.LIKE_TOGGLE)
  async toggle(data: any) {
    const rawUserId = data?.body?.userId ?? data?.user?.sub ?? data?.user?.id;
    const rawProductId = data?.body?.productId;
    const userId = rawUserId != null ? String(rawUserId) : '';
    const productId = rawProductId != null ? String(rawProductId) : '';
    if (!userId || !productId) {
      throw new RpcException({ statusCode: 400, message: 'userId and productId are required' });
    }
    const result = await this.toggleLikeUseCase.execute(userId, productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_COUNT)
  async getCount(data: any) {
    const productId = data?.body?.productId || data?.params?.id || data?.query?.productId;
    const result = await this.getLikeCountUseCase.execute(productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_BATCH_COUNT)
  async getBatchCount(data: any) {
    const productIds = data?.body?.productIds || data?.productIds || [];
    const result = await this.getBatchLikeCountsUseCase.execute(productIds);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_BATCH_LIKER_IDS)
  async getBatchLikerIds(data: any) {
    const productIds = data?.body?.productIds || data?.productIds || [];
    const result = await this.getBatchLikerIdsUseCase.execute(productIds);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_CHECK)
  async hasUserLiked(data: any) {
    const userId = data?.body?.userId || data?.query?.userId;
    const productId = data?.body?.productId || data?.query?.productId;
    const result = await this.checkLikeUseCase.execute(userId, productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_FIND_BY_USER)
  async findByUser(data: any) {
    const userId = data?.body?.userId || data?.params?.id || data?.query?.userId;
    const result = await this.findLikesByUserUseCase.execute(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
