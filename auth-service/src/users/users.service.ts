import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Model } from 'mongoose';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { TokenService } from '../auth/token.service';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from './dto/enums/user-role.enum';
import { UserStatus } from './dto/enums/user-status.enum';
import { ServiceError } from '../common/exceptions';
import { successPayload } from '../common/interfaces/api-response.interface';
import { S3Service } from '../s3/s3.service';

const NOTATION_CLIENT = 'NOTATION_CLIENT';
const RATING_AVERAGE = 'rating/average';
const FOLLOWER_COUNT = 'follower/count';
const PROFILE_LIKE_COUNT = 'profile-like/count';

/** Map a Mongoose user document to a safe DTO (never leaks passwordHash / refreshToken). */
function toUserDto(user: UserDocument) {
  const walletBalanceRaw = (user as any).walletBalance;
  const stripeAccountIdRaw = (user as any).stripeAccountId;
  const walletBalance =
    typeof walletBalanceRaw === 'number' && Number.isFinite(walletBalanceRaw)
      ? walletBalanceRaw
      : undefined;
  const stripeAccountId = typeof stripeAccountIdRaw === 'string' && stripeAccountIdRaw.trim().length > 0
    ? stripeAccountIdRaw
    : null;

  const base: Record<string, unknown> = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone ?? null,
    city: user.city ?? null,
    address: user.address ?? null,
    country: user.country ?? null,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    description: user.description ?? null,
    photo: user.photo ?? null,
    coverPhoto: user.coverPhoto ?? null,
    createdAt: user.createdAt,
    walletBalance,
    stripeAccountId,
  };
  if (user.role === UserRole.LIVREUR) {
    const livreur = user as any;
    base.vehicleType = livreur.vehicleType ?? null;
    base.deliveriesCompleted = typeof livreur.deliveriesCompleted === 'number' ? livreur.deliveriesCompleted : 0;
  }
  return base;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly s3Service: S3Service,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(NOTATION_CLIENT) private readonly notationClient: ClientProxy,
  ) {}

  async register(dto: CreateUserDto) {
    try {
      if (!dto.email || !dto.password || !dto.name) {
        return new ServiceError(
          'VALIDATION_ERROR',
          'Missing required fields',
          400,
          'auth-service',
          { fields: ['email', 'password', 'name'] },
        );
      }

      const existing = await this.findByEmail(dto.email);
      if (existing) {
        return new ServiceError(
          'CONFLICT',
          'Email already in use',
          409,
          'auth-service',
          { field: 'email' },
        );
      }

      const passwordHash = await bcrypt.hash(dto.password, 10);
      const role = dto.role ?? UserRole.CLIENT;
      const refreshToken = this.tokenService.generateRefreshToken({ sub: dto.email });

      const status = dto.status ?? UserStatus.ACTIVE;
      // ── Detect base64 profile photo for MinIO upload ──
      const photoData = (dto as any).photo;
      const isBase64Photo = photoData && typeof photoData === 'string' && photoData.length > 200;

      const user = await this.userModel.create({
        name: dto.name,
        email: dto.email,
        passwordHash,
        role,
        refreshToken,
        phone: dto.phone ?? null,
        photo: null, // will be set after MinIO upload
        coverPhoto: dto.coverPhoto ?? null,
        city: dto.city ?? null,
        address: dto.address ?? null,
        country: dto.country ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        description: dto.description ?? null,
        status,
      });

      // Upload profile photo to MinIO now that we have the real user ID
      if (isBase64Photo) {
        try {
          const buffer = Buffer.from(photoData, 'base64');
          const mime = (dto as any).photoMimetype || 'image/jpeg';
          const filename = (dto as any).photoFilename || undefined;
          const photoUrl = await this.s3Service.uploadProfilePic(user._id.toString(), buffer, mime, filename);
          user.photo = photoUrl;
          await user.save();
          this.logger.log(`Profile photo uploaded to MinIO for user ${user._id}`);
        } catch (uploadErr) {
          this.logger.warn(`Failed to upload profile photo during registration: ${uploadErr?.message}`);
          // Non-blocking: user is created, photo just won't be set
        }
      }

      const userId = user._id.toString();
      const accessToken = this.tokenService.generateAccessToken({
        sub: userId,
        email: user.email,
        role: user.role,
      });

      // Safety: never return raw base64 in the response — only paths/URLs or null
      if (user.photo && !user.photo.startsWith('/files/') && !user.photo.startsWith('http')) {
        user.photo = null;
      }

      return successPayload(
        'User registered successfully',
        {
          user: toUserDto(user),
          accessToken,
          refreshToken: user.refreshToken,
        },
        201,
      );
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to register user',
        500,
        'auth-service',
      );
    }
  }

  async login(dto: LoginDto) {
    try {
      if (!dto.email || !dto.password) {
        return new ServiceError(
          'VALIDATION_ERROR',
          'Missing required fields',
          400,
          'auth-service',
          { fields: ['email', 'password'] },
        );
      }

      const user = await this.findByEmail(dto.email);
      if (!user) {
        return new ServiceError('NOT_FOUND', 'User not found', 404, 'auth-service');
      }

      const valid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!valid) {
        return new ServiceError('UNAUTHORIZED', 'Invalid credentials', 401, 'auth-service');
      }

      if (user.status === UserStatus.SUSPENDED) {
        return new ServiceError('FORBIDDEN', 'Account is suspended', 403, 'auth-service');
      }

      const userId = user._id.toString();
      const accessToken = this.tokenService.generateAccessToken({
        sub: userId,
        email: user.email,
        role: user.role,
      });

      this.logger.debug(`Generated access token for user ${user.email}`);

      return successPayload('Login successful', {
        user: toUserDto(user),
        accessToken,
        refreshToken: user.refreshToken,
      });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to login',
        500,
        'auth-service',
      );
    }
  }

  async logout(userId: string, res: any) {
    try {
      if (!userId) {
        return new ServiceError('VALIDATION_ERROR', 'User ID is required', 400, 'auth-service');
      }

      await this.userModel.findByIdAndUpdate(userId, { refreshToken: null }).exec();
      res.clearCookie('refreshToken');

      return successPayload('Logged out successfully', null);
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to logout',
        500,
        'auth-service',
      );
    }
  }

  async refresh(refreshToken: string) {
    try {
      if (!refreshToken) {
        return new ServiceError(
          'VALIDATION_ERROR',
          'Refresh token is required',
          400,
          'auth-service',
        );
      }

      const user = await this.userModel.findOne({ refreshToken }).exec();
      if (!user) {
        return new ServiceError('NOT_FOUND', 'Invalid refresh token', 404, 'auth-service');
      }

      const accessToken = this.tokenService.generateAccessToken({
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      return successPayload('Token refreshed successfully', {
        accessToken,
        refreshToken: user.refreshToken,
      });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to refresh token',
        500,
        'auth-service',
      );
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email }).exec();
    } catch {
      return null;
    }
  }

  /**
   * Batch-fetch users by an array of IDs.
   * Returns a map of { [userId]: userDto } for cross-service enrichment.
   */
  async findByIds(ids: string[]) {
    try {
      if (!ids || ids.length === 0) {
        return successPayload('No user IDs provided', { users: {} });
      }

      const users = await this.userModel.find({ _id: { $in: ids } }).exec();
      const usersMap: Record<string, any> = {};
      for (const user of users) {
        usersMap[user._id.toString()] = toUserDto(user);
      }

      return successPayload('Users fetched successfully', { users: usersMap });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to fetch users by IDs',
        500,
        'auth-service',
      );
    }
  }

  /**
   * Upload profile picture to MinIO and set user.photo to the returned URL.
   * Deletes the old profile pic from MinIO if it exists (same bucket path).
   * Payload: { userId, file: base64 string, mimetype?, filename? }
   */
  async uploadProfilePic(
    userId: string,
    fileBase64: string,
    mimeType?: string,
    filename?: string,
  ) {
    try {
      if (!userId || !fileBase64) {
        return new ServiceError(
          'VALIDATION_ERROR',
          'userId and file (base64) are required',
          400,
          'auth-service',
          { fields: ['userId', 'file'] },
        );
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return new ServiceError('NOT_FOUND', 'User not found', 404, 'auth-service');
      }

      const oldPhotoPath = user.photo ?? null;
      if (oldPhotoPath) {
        await this.s3Service.deleteByStoredPath(oldPhotoPath);
      }

      const buffer = Buffer.from(fileBase64, 'base64');
      const mime = mimeType || 'image/jpeg';

      const photoUrl = await this.s3Service.uploadProfilePic(userId, buffer, mime, filename);
      user.photo = photoUrl;
      await user.save();

      return successPayload('Profile picture uploaded', {
        user: toUserDto(user),
        photoUrl,
      });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to upload profile picture',
        500,
        'auth-service',
      );
    }
  }

  /**
   * Update user profile (name, email, phone, city, address, description, optional new photo).
   * If photo (base64) is provided: deletes old pic from MinIO, uploads new one, sets user.photo.
   */
  /**
   * Get full profile for the current user: user data + rating (average, count) + followers count.
   * Calls notation service for rating and follower count.
   */
  async getProfile(userId: string) {
    try {
      if (!userId) {
        return new ServiceError('VALIDATION_ERROR', 'userId is required', 400, 'auth-service');
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return new ServiceError('NOT_FOUND', 'User not found', 404, 'auth-service');
      }

      const payload = { params: { id: userId } };
      const rating$ = this.notationClient.send(RATING_AVERAGE, payload).pipe(
        timeout(5000),
        catchError((err) => {
          this.logger.warn(`Notation rating/average failed for ${userId}: ${err?.message}`);
          return of({ success: true, data: { average: 0, count: 0 } });
        }),
      );
      const follower$ = this.notationClient.send(FOLLOWER_COUNT, payload).pipe(
        timeout(5000),
        catchError((err) => {
          this.logger.warn(`Notation follower/count failed for ${userId}: ${err?.message}`);
          return of({ success: true, data: { count: 0 } });
        }),
      );
      const profileLike$ = this.notationClient.send(PROFILE_LIKE_COUNT, payload).pipe(
        timeout(5000),
        catchError((err) => {
          this.logger.warn(`Notation profile-like/count failed for ${userId}: ${err?.message}`);
          return of({ success: true, data: { count: 0 } });
        }),
      );

      const [ratingRes, followerRes, profileLikeRes] = await Promise.all([
        firstValueFrom(rating$),
        firstValueFrom(follower$),
        firstValueFrom(profileLike$),
      ]);

      const ratingData = (ratingRes as any)?.data;
      const rating = {
        average: Number(ratingData?.average) || 0,
        count: Number(ratingData?.count) || 0,
      };
      const followersCount = Number((followerRes as any)?.data?.count) || 0;
      const likesCount = Number((profileLikeRes as any)?.data?.count) || 0;

      return successPayload('Profile fetched', {
        user: toUserDto(user),
        rating,
        followersCount,
        likesCount,
      });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to get profile',
        500,
        'auth-service',
      );
    }
  }

  async updateProfile(
    userId: string,
    dto: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string | null;
      city?: string | null;
      address?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      description?: string | null;
      photo?: string | null;
      photoMimetype?: string;
      photoFilename?: string;
    },
  ) {
    try {
      if (!userId) {
        return new ServiceError('VALIDATION_ERROR', 'userId is required', 400, 'auth-service');
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return new ServiceError('NOT_FOUND', 'User not found', 404, 'auth-service');
      }

      if (dto.name !== undefined) user.name = dto.name.trim();
      if (dto.phone !== undefined) user.phone = dto.phone?.trim() || null;
      if (dto.city !== undefined) user.city = dto.city?.trim() || null;
      if (dto.address !== undefined) user.address = dto.address?.trim() || null;
      if (dto.country !== undefined) user.country = dto.country?.trim() || null;
      if (dto.latitude !== undefined) user.latitude = dto.latitude ?? null;
      if (dto.longitude !== undefined) user.longitude = dto.longitude ?? null;
      if (dto.description !== undefined) user.description = dto.description?.trim() || null;

      if (dto.email !== undefined && dto.email.trim() !== user.email) {
        const newEmail = dto.email.trim().toLowerCase();
        const existing = await this.findByEmail(newEmail);
        if (existing) {
          return new ServiceError('CONFLICT', 'Email already in use', 409, 'auth-service', { field: 'email' });
        }
        user.email = newEmail;
      }

      if (dto.password !== undefined && dto.password.trim()) {
        user.passwordHash = await bcrypt.hash(dto.password.trim(), 10);
      }

      const isBase64Photo = dto.photo && typeof dto.photo === 'string' && dto.photo.length > 200;
      if (isBase64Photo) {
        const oldPhotoPath = user.photo ?? null;
        if (oldPhotoPath) {
          await this.s3Service.deleteByStoredPath(oldPhotoPath);
        }
        const buffer = Buffer.from(dto.photo!, 'base64');
        const mime = dto.photoMimetype || 'image/jpeg';
        const photoUrl = await this.s3Service.uploadProfilePic(userId, buffer, mime, dto.photoFilename);
        user.photo = photoUrl;
      }

      await user.save();

      return successPayload('Profile updated', { user: toUserDto(user) });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to update profile',
        500,
        'auth-service',
      );
    }
  }

  async topUpWallet(userId: string, amount: number) {
    try {
      const normalizedAmount = Number(amount);
      if (!userId) {
        return new ServiceError('VALIDATION_ERROR', 'userId is required', 400, 'auth-service');
      }
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        return new ServiceError('VALIDATION_ERROR', 'amount must be greater than 0', 400, 'auth-service');
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return new ServiceError('NOT_FOUND', 'User not found', 404, 'auth-service');
      }

      const currentWallet = Number((user as any).walletBalance ?? 0);
      const nextWallet = Number((currentWallet + normalizedAmount).toFixed(2));
      (user as any).walletBalance = nextWallet;
      await user.save();

      return successPayload('Wallet topped up successfully', {
        user: toUserDto(user),
        walletBalance: nextWallet,
      });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to top up wallet',
        500,
        'auth-service',
      );
    }
  }

  async getPlatformAccount() {
    try {
      const user = await this.userModel
        .findOne({
          role: { $in: [UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN] },
        })
        .sort({ createdAt: 1 })
        .exec();

      if (!user) {
        return new ServiceError('NOT_FOUND', 'Platform account not found', 404, 'auth-service');
      }

      return successPayload('Platform account fetched', {
        user: toUserDto(user),
      });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to fetch platform account',
        500,
        'auth-service',
      );
    }
  }

  async debitWallet(userId: string, amount: number) {
    try {
      const normalizedAmount = Number(amount);
      if (!userId) {
        return new ServiceError('VALIDATION_ERROR', 'userId is required', 400, 'auth-service');
      }
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        return new ServiceError('VALIDATION_ERROR', 'amount must be greater than 0', 400, 'auth-service');
      }

      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        return new ServiceError('NOT_FOUND', 'User not found', 404, 'auth-service');
      }

      const currentWallet = Number((user as any).walletBalance ?? 0);
      if (currentWallet < normalizedAmount) {
        return new ServiceError('VALIDATION_ERROR', 'Top up your wallet', 400, 'auth-service');
      }

      const nextWallet = Number((currentWallet - normalizedAmount).toFixed(2));
      (user as any).walletBalance = nextWallet;
      await user.save();

      return successPayload('Wallet debited successfully', {
        user: toUserDto(user),
        walletBalance: nextWallet,
      });
    } catch (error) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to debit wallet',
        500,
        'auth-service',
      );
    }
  }
}