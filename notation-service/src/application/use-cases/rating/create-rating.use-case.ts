import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { io } from 'socket.io-client';
import { RATING_REPOSITORY } from '../../../domain/repositories/rating.repository.interface';
import type { IRatingRepository } from '../../../domain/repositories/rating.repository.interface';
import { Rating } from '../../../domain/entities/rating.entity';
import { ServiceError } from '../../../common/exceptions';
import { successPayload } from '../../../common/types/response-helpers';

export interface CreateRatingDto {
  fromUserId: string;
  toUserId: string;
  orderId?: string | null;
  productId?: string | null;
  stars: number;
  comment?: string;
}

@Injectable()
export class CreateRatingUseCase {
  private readonly logger = new Logger(CreateRatingUseCase.name);

  constructor(
    @Inject(RATING_REPOSITORY) private readonly ratingRepository: IRatingRepository,
    private readonly configService: ConfigService,
  ) {}

  private emitRatingCreated(payload: {
    toUserId: string;
    productId: string | null;
    orderId: string | null;
  }) {
    try {
      const baseUrl =
        this.configService.get<string>('GATEWAY_WS_URL') || 'http://gateway:3000/ratings';
      const socket = io(baseUrl, { transports: ['websocket'] });
      socket.emit('rating.created', payload);
      setTimeout(() => socket.disconnect(), 500);
    } catch (err: any) {
      this.logger.warn(`Failed to emit rating.created: ${err?.message ?? 'unknown'}`);
    }
  }

  async execute(dto: CreateRatingDto) {
    try {
      if (!dto.orderId && !dto.productId) {
        return new ServiceError(
          'VALIDATION_ERROR',
          'Either orderId or productId is required',
          400,
        );
      }

      const validationResult = Rating.create({
        fromUserId: dto.fromUserId,
        toUserId: dto.toUserId,
        orderId: dto.orderId ?? null,
        productId: dto.productId ?? null,
        stars: dto.stars,
        comment: dto.comment,
      });

      if (validationResult instanceof ServiceError) {
        return validationResult;
      }

      const existingFilter = dto.orderId
        ? { fromUserId: dto.fromUserId, toUserId: dto.toUserId, orderId: dto.orderId }
        : { fromUserId: dto.fromUserId, productId: dto.productId ?? undefined };

      const existing = await this.ratingRepository.findOne(existingFilter);
      if (existing) {
        return new ServiceError('CONFLICT', 'You have already rated this', 409);
      }

      const rating = await this.ratingRepository.create({
        fromUserId: dto.fromUserId,
        toUserId: dto.toUserId,
        orderId: dto.orderId ?? null,
        productId: dto.productId ?? null,
        stars: dto.stars,
        comment: dto.comment,
      });

      this.emitRatingCreated({
        toUserId: dto.toUserId,
        productId: dto.productId ?? null,
        orderId: dto.orderId ?? null,
      });

      return successPayload('Rating created successfully', { rating }, 201);
    } catch (error: any) {
      this.logger.error(`Failed to create rating: ${error?.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to create rating',
        500,
      );
    }
  }
}
