import { Controller, Res, Req } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ValidatedBody } from '../common/decorators/validated-body.decorator';
import { ServiceError } from '../common/exceptions';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('auth/register')
  async register(@ValidatedBody(CreateUserDto) dto: CreateUserDto) {
    const result = await this.usersService.register(dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/login')
  async login(@ValidatedBody(LoginDto) dto: LoginDto) {
    const result = await this.usersService.login(dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/logout')
  async logout(@Req() req, @Res() res) {
    const result = await this.usersService.logout(req.user.id, res);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/refresh')
  async refresh(data: { body: { refreshToken: string } }) {
    const result = await this.usersService.refresh(data.body.refreshToken);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/upload-profile-pic')
  async uploadProfilePic(payload: { userId: string; file: string; mimetype?: string; filename?: string }) {
    const result = await this.usersService.uploadProfilePic(
      payload.userId,
      payload.file,
      payload.mimetype,
      payload.filename,
    );
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/find-by-ids')
  async findByIds(data: any) {
    // Gateway wraps the HTTP body inside payload.body; also support direct { ids } for internal calls.
    const ids: string[] = data?.body?.ids ?? data?.ids ?? [];
    const result = await this.usersService.findByIds(ids);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/get-profile')
  async getProfile(payload: { user?: { id?: string; sub?: string } }) {
    const userId = payload.user?.id ?? payload.user?.sub;
    if (!userId) {
      throw new RpcException({
        success: false,
        statusCode: 401,
        message: 'Unauthorized: user id required',
      });
    }
    const result = await this.usersService.getProfile(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  /** Get any user's profile by id (for viewing patissiere/client profile from explore). */
  @MessagePattern('auth/profile')
  async getProfileById(payload: { params?: { id?: string } }) {
    const userId = payload.params?.id;
    if (!userId) {
      throw new RpcException({
        success: false,
        statusCode: 400,
        message: 'User id is required',
      });
    }
    const result = await this.usersService.getProfile(userId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/update-profile')
  async updateProfile(payload: { user?: { id?: string; sub?: string }; body?: Record<string, any> }) {
    const userId = payload.user?.id ?? payload.user?.sub ?? payload.body?.userId;
    if (!userId) {
      throw new RpcException({
        success: false,
        statusCode: 401,
        message: 'Unauthorized: user id required',
      });
    }
    const result = await this.usersService.updateProfile(userId, payload.body ?? {});
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/wallet/topup')
  async topUpWallet(payload: { userId?: string; amount?: number }) {
    const userId = payload?.userId;
    const amount = Number(payload?.amount ?? 0);
    const result = await this.usersService.topUpWallet(userId ?? '', amount);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/platform-account')
  async getPlatformAccount() {
    const result = await this.usersService.getPlatformAccount();
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('auth/wallet/debit')
  async debitWallet(payload: { userId?: string; amount?: number }) {
    const userId = payload?.userId;
    const amount = Number(payload?.amount ?? 0);
    const result = await this.usersService.debitWallet(userId ?? '', amount);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}