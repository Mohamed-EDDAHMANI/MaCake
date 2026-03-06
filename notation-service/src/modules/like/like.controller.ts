import { Controller } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { LikeService } from './like.service';
import { ServiceError } from '../../common/exceptions';
import { NOTATION_PATTERNS } from '../../messaging/constants';

@Controller()
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @MessagePattern(NOTATION_PATTERNS.LIKE_TOGGLE)
  async toggle(data: any) {
    // Prefer body.userId (sent by client); fallback to gateway-injected user (JWT)
    const rawUserId = data?.body?.userId ?? data?.user?.sub ?? data?.user?.id;
    const rawProductId = data?.body?.productId;
    const userId = rawUserId != null ? String(rawUserId) : '';
    const productId = rawProductId != null ? String(rawProductId) : '';
    if (!userId || !productId) {
      throw new RpcException({ statusCode: 400, message: 'userId and productId are required' });
    }
    const result = await this.likeService.toggle(userId, productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_COUNT)
  async getCount(data: any) {
    const productId = data?.body?.productId || data?.params?.id || data?.query?.productId;
    const result = await this.likeService.getCount(productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_BATCH_COUNT)
  async getBatchCount(data: any) {
    const productIds = data?.body?.productIds || data?.productIds || [];
    const result = await this.likeService.getBatchCount(productIds);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_BATCH_LIKER_IDS)
  async getBatchLikerIds(data: any) {
    const productIds = data?.body?.productIds || data?.productIds || [];
    const result = await this.likeService.getBatchLikerIds(productIds);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_CHECK)
  async hasUserLiked(data: any) {
    const userId = data?.body?.userId || data?.query?.userId;
    const productId = data?.body?.productId || data?.query?.productId;
    const result = await this.likeService.hasUserLiked(userId, productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.LIKE_FIND_BY_USER)
  async findByUser(data: any) {
    const userId = data?.body?.userId || data?.params?.id || data?.query?.userId;
    const result = await this.likeService.findByUser(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
