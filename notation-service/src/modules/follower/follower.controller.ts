import { Controller } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { FollowerService } from './follower.service';
import { ServiceError } from '../../common/exceptions';
import { NOTATION_PATTERNS } from '../../messaging/constants';

@Controller()
export class FollowerController {
  constructor(private readonly followerService: FollowerService) {}

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_TOGGLE)
  async toggle(data: any) {
    const { clientId, patissiereId } = data?.body ?? {};
    const result = await this.followerService.toggle(clientId, patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_LIST)
  async getFollowers(data: any) {
    const patissiereId = data?.body?.patissiereId || data?.params?.id || data?.query?.patissiereId;
    const result = await this.followerService.getFollowers(patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_COUNT)
  async getCount(data: any) {
    const patissiereId = data?.body?.patissiereId || data?.params?.id || data?.query?.patissiereId;
    const result = await this.followerService.getCount(patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(NOTATION_PATTERNS.FOLLOWER_CHECK)
  async isFollowing(data: any) {
    const clientId = data?.body?.clientId || data?.query?.clientId;
    const patissiereId = data?.body?.patissiereId || data?.query?.patissiereId;
    const result = await this.followerService.isFollowing(clientId, patissiereId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
