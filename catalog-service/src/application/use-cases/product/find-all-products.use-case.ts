import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError, of } from 'rxjs';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { ProductMapper } from '../../mappers/product.mapper';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';
import { AUTH_CLIENT, AUTH_PATTERNS, NOTATION_CLIENT, NOTATION_PATTERNS } from '../../../messaging';

@Injectable()
export class FindAllProductsUseCase {
  private readonly logger = new Logger(FindAllProductsUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(AUTH_CLIENT) private readonly authClient: ClientProxy,
    @Inject(NOTATION_CLIENT) private readonly notationClient: ClientProxy,
  ) {}

  async execute(payload?: { query?: { patissiereId?: string } }): Promise<ApiResponse<any> | ServiceError> {
    try {
      const patissiereId = payload?.query?.patissiereId?.trim();
      const filter: { isActive: boolean; patissiereId?: string } = { isActive: true };
      if (patissiereId) filter.patissiereId = patissiereId;

      const products = await this.productRepo.findMany(filter);
      const dtos = ProductMapper.toDtoList(products);
      const enriched = await this.enrichProducts(dtos);

      return successPayload('Products fetched successfully', { products: enriched, count: enriched.length });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to fetch products: ${error.message}`, 500,
        'catalog-service', { originalError: error.code });
    }
  }

  private async enrichProducts(products: any[]): Promise<any[]> {
    const patissiereIds = [...new Set(products.map((p) => p.patissiereId).filter(Boolean))];
    const productIds = products.map((p) => p.id).filter(Boolean);

    const [usersResult, ratingsResult, likesResult, likerIdsResult] = await Promise.all([
      this.fetchUsersByIds(patissiereIds),
      this.fetchBatchAverageRatings(patissiereIds),
      this.fetchBatchLikeCounts(productIds),
      this.fetchBatchLikerIds(productIds),
    ]);

    return products.map((p) => {
      const user = usersResult[p.patissiereId];
      const rating = ratingsResult[p.patissiereId];
      const likesCount = likesResult[p.id] ?? 0;
      const likedByUserIds = (likerIdsResult[p.id] ?? []).map(String);
      return {
        ...p,
        likesCount,
        likedByUserIds,
        location: user?.city ?? null,
        patissiere: user
          ? { id: user.id, name: user.name, photo: user.photo ?? null, city: user.city ?? null,
              address: user.address ?? null, rating: rating?.average ?? 0, ratingCount: rating?.count ?? 0 }
          : null,
      };
    });
  }

  private async fetchUsersByIds(ids: string[]): Promise<Record<string, any>> {
    if (!ids.length) return {};
    try {
      const res = await lastValueFrom(
        this.authClient.send(AUTH_PATTERNS.FIND_BY_IDS, { ids }).pipe(timeout(5000), catchError(() => of({ data: { users: {} } }))),
        { defaultValue: { data: { users: {} } } },
      );
      return res?.data?.users ?? {};
    } catch { return {}; }
  }

  private async fetchBatchAverageRatings(userIds: string[]): Promise<Record<string, { average: number; count: number }>> {
    if (!userIds.length) return {};
    try {
      const res = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.RATING_BATCH_AVERAGE, { userIds }).pipe(timeout(5000), catchError(() => of({ data: { ratings: {} } }))),
        { defaultValue: { data: { ratings: {} } } },
      );
      return res?.data?.ratings ?? {};
    } catch { return {}; }
  }

  private async fetchBatchLikeCounts(productIds: string[]): Promise<Record<string, number>> {
    if (!productIds.length) return {};
    try {
      const res = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.LIKE_BATCH_COUNT, { productIds }).pipe(timeout(5000), catchError(() => of({ data: { likes: {} } }))),
        { defaultValue: { data: { likes: {} } } },
      );
      return res?.data?.likes ?? {};
    } catch { return {}; }
  }

  private async fetchBatchLikerIds(productIds: string[]): Promise<Record<string, string[]>> {
    if (!productIds.length) return {};
    try {
      const res = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.LIKE_BATCH_LIKER_IDS, { productIds }).pipe(timeout(5000), catchError(() => of({ data: { likerIds: {} } }))),
        { defaultValue: { data: { likerIds: {} } } },
      );
      return res?.data?.likerIds ?? {};
    } catch { return {}; }
  }
}
