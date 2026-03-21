import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { RpcException } from '@nestjs/microservices';
import { RatingService } from './rating.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { ValidatedBody } from '../../common/decorators/validated-body.decorator';
import { ServiceError } from '../../common/exceptions';
import { NOTATION_PATTERNS } from '../../messaging/constants';

@Controller()
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @MessagePattern(NOTATION_PATTERNS.RATING_CREATE)
  async create(@ValidatedBody(CreateRatingDto) dto: CreateRatingDto) {
    const result = await this.ratingService.create(dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_FIND_BY_USER)
  async findByUser(data: any) {
    const userId = data?.body?.userId || data?.params?.id || data?.query?.userId;
    const result = await this.ratingService.findByUser(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_FIND_BY_PRODUCT)
  async findByProduct(data: any) {
    const productId = data?.body?.productId || data?.params?.id || data?.query?.productId;
    const result = await this.ratingService.findByProduct(productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_AVERAGE)
  async getAverage(data: any) {
    const userId = data?.body?.userId || data?.params?.id || data?.query?.userId;
    const result = await this.ratingService.getAverage(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_BATCH_AVERAGE)
  async getBatchAverage(data: { userIds: string[] }) {
    const result = await this.ratingService.getAverageForUsers(data.userIds);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_CHECK_BY_ORDER)
  async checkByOrder(data: any) {
    const fromUserId = data?.body?.fromUserId || data?.query?.fromUserId;
    const orderId = data?.body?.orderId || data?.query?.orderId || data?.params?.id;
    const result = await this.ratingService.checkByOrder(fromUserId, orderId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_DELETE)
  async delete(data: any) {
    const ratingId = data?.params?.id || data?.body?.ratingId;
    const result = await this.ratingService.delete(ratingId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
