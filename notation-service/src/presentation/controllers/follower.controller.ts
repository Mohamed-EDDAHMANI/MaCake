import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { ServiceError } from '../../common/exceptions';
import { NOTATION_PATTERNS } from '../../messaging/constants';
import { ToggleFollowerUseCase } from '../../application/use-cases/follower/toggle-follower.use-case';
import { GetFollowersUseCase } from '../../application/use-cases/follower/get-followers.use-case';
import { GetFollowerCountUseCase } from '../../application/use-cases/follower/get-follower-count.use-case';
import { CheckFollowerUseCase } from '../../application/use-cases/follower/check-follower.use-case';

@Controller()
export class FollowerController {
  constructor(
    @Inject(ToggleFollowerUseCase) private readonly toggleFollowerUseCase: ToggleFollowerUseCase,
    @Inject(GetFollowersUseCase) private readonly getFollowersUseCase: GetFollowersUseCase,
    @Inject(GetFollowerCountUseCase) private readonly getFollowerCountUseCase: GetFollowerCountUseCase,
    @Inject(CheckFollowerUseCase) private readonly checkFollowerUseCase: CheckFollowerUseCase,
  ) {}

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_TOGGLE)
  async toggle(data: any) {
    const { clientId, patissiereId } = data?.body ?? {};
    const result = await this.toggleFollowerUseCase.execute(clientId, patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_LIST)
  async getFollowers(data: any) {
    const patissiereId = data?.body?.patissiereId || data?.params?.id || data?.query?.patissiereId;
    const result = await this.getFollowersUseCase.execute(patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_COUNT)
  async getCount(data: any) {
    const patissiereId = data?.body?.patissiereId || data?.params?.id || data?.query?.patissiereId;
    const result = await this.getFollowerCountUseCase.execute(patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_CHECK)
  async isFollowing(data: any) {
    const clientId = data?.body?.clientId || data?.query?.clientId;
    const patissiereId = data?.body?.patissiereId || data?.query?.patissiereId;
    const result = await this.checkFollowerUseCase.execute(clientId, patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
