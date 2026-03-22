import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { ServiceError } from '../../common/exceptions';
import { NOTATION_PATTERNS } from '../../messaging/constants';
import { ValidatedBody } from '../../common/decorators/validated-body.decorator';
import { CreateRatingDto as CreateRatingDtoOrigin } from '../dto/create-rating.dto';
import { CreateRatingUseCase } from '../../application/use-cases/rating/create-rating.use-case';
import { FindRatingsByUserUseCase } from '../../application/use-cases/rating/find-ratings-by-user.use-case';
import { FindRatingsByProductUseCase } from '../../application/use-cases/rating/find-ratings-by-product.use-case';
import { GetAverageRatingUseCase } from '../../application/use-cases/rating/get-average-rating.use-case';
import { GetBatchAverageRatingsUseCase } from '../../application/use-cases/rating/get-batch-average-ratings.use-case';
import { CheckRatingByOrderUseCase } from '../../application/use-cases/rating/check-rating-by-order.use-case';
import { DeleteRatingUseCase } from '../../application/use-cases/rating/delete-rating.use-case';

@Controller()
export class RatingController {
  constructor(
    @Inject(CreateRatingUseCase) private readonly createRatingUseCase: CreateRatingUseCase,
    @Inject(FindRatingsByUserUseCase) private readonly findRatingsByUserUseCase: FindRatingsByUserUseCase,
    @Inject(FindRatingsByProductUseCase) private readonly findRatingsByProductUseCase: FindRatingsByProductUseCase,
    @Inject(GetAverageRatingUseCase) private readonly getAverageRatingUseCase: GetAverageRatingUseCase,
    @Inject(GetBatchAverageRatingsUseCase) private readonly getBatchAverageRatingsUseCase: GetBatchAverageRatingsUseCase,
    @Inject(CheckRatingByOrderUseCase) private readonly checkRatingByOrderUseCase: CheckRatingByOrderUseCase,
    @Inject(DeleteRatingUseCase) private readonly deleteRatingUseCase: DeleteRatingUseCase,
  ) {}

  @MessagePattern(NOTATION_PATTERNS.RATING_CREATE)
  async create(@ValidatedBody(CreateRatingDtoOrigin) dto: CreateRatingDtoOrigin) {
    const result = await this.createRatingUseCase.execute(dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_FIND_BY_USER)
  async findByUser(data: any) {
    const userId = data?.body?.userId || data?.params?.id || data?.query?.userId;
    const result = await this.findRatingsByUserUseCase.execute(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_FIND_BY_PRODUCT)
  async findByProduct(data: any) {
    const productId = data?.body?.productId || data?.params?.id || data?.query?.productId;
    const result = await this.findRatingsByProductUseCase.execute(productId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_AVERAGE)
  async getAverage(data: any) {
    const userId = data?.body?.userId || data?.params?.id || data?.query?.userId;
    const result = await this.getAverageRatingUseCase.execute(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_BATCH_AVERAGE)
  async getBatchAverage(data: { userIds: string[] }) {
    const result = await this.getBatchAverageRatingsUseCase.execute(data.userIds);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_CHECK_BY_ORDER)
  async checkByOrder(data: any) {
    const fromUserId = data?.body?.fromUserId || data?.query?.fromUserId;
    const orderId = data?.body?.orderId || data?.query?.orderId || data?.params?.id;
    const result = await this.checkRatingByOrderUseCase.execute(fromUserId, orderId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.RATING_DELETE)
  async delete(data: any) {
    const ratingId = data?.params?.id || data?.body?.ratingId;
    const result = await this.deleteRatingUseCase.execute(ratingId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
