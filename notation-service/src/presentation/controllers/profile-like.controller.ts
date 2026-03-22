import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { ServiceError } from '../../common/exceptions';
import { NOTATION_PATTERNS } from '../../messaging/constants';
import { ToggleProfileLikeUseCase } from '../../application/use-cases/profile-like/toggle-profile-like.use-case';
import { GetProfileLikeCountUseCase } from '../../application/use-cases/profile-like/get-profile-like-count.use-case';
import { CheckProfileLikeUseCase } from '../../application/use-cases/profile-like/check-profile-like.use-case';

@Controller()
export class ProfileLikeController {
  constructor(
    @Inject(ToggleProfileLikeUseCase) private readonly toggleProfileLikeUseCase: ToggleProfileLikeUseCase,
    @Inject(GetProfileLikeCountUseCase) private readonly getProfileLikeCountUseCase: GetProfileLikeCountUseCase,
    @Inject(CheckProfileLikeUseCase) private readonly checkProfileLikeUseCase: CheckProfileLikeUseCase,
  ) {}

  @MessagePattern(NOTATION_PATTERNS.PROFILE_LIKE_TOGGLE)
  async toggle(data: any) {
    const rawUserId = data?.body?.userId ?? data?.user?.sub ?? data?.user?.id;
    const rawPatissiereId = data?.body?.patissiereId;
    const userId = rawUserId != null ? String(rawUserId) : '';
    const patissiereId = rawPatissiereId != null ? String(rawPatissiereId) : '';
    if (!userId || !patissiereId) {
      throw new RpcException({
        statusCode: 400,
        message: 'userId and patissiereId are required',
      });
    }
    const result = await this.toggleProfileLikeUseCase.execute(userId, patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.PROFILE_LIKE_COUNT)
  async getCount(data: any) {
    const patissiereId =
      data?.body?.patissiereId || data?.params?.id || data?.query?.patissiereId;
    const result = await this.getProfileLikeCountUseCase.execute(patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.PROFILE_LIKE_CHECK)
  async hasLiked(data: any) {
    const userId = data?.body?.userId || data?.query?.userId;
    const patissiereId = data?.body?.patissiereId || data?.query?.patissiereId;
    const result = await this.checkProfileLikeUseCase.execute(userId, patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
