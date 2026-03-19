import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError, of } from 'rxjs';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
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
      const dtos = products.map((p) => this.toDto(p));

      // Enrich with patissiere info, ratings, and like counts in parallel
      const enriched = await this.enrichProducts(dtos);

      return successPayload('Products fetched successfully', {
        products: enriched,
        count: enriched.length,
      });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to fetch products: ${error.message}`,
        500,
        'catalog-service',
        { originalError: error.code },
      );
    }
  }

  /**
   * Enrich products with patissiere (author) info from auth-service (city, address, photo, etc.),
   * plus rating/likes from notation-service via RMQ.
   * Auth findByIds returns user DTO with city + address (User entity); we pass them in patissiere.
   */
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
      const patissiereIdStr =
        typeof p.patissiereId === 'string' ? p.patissiereId : (p.patissiereId as any)?.toString?.() ?? '';
      const productIdStr = p.id != null ? String(p.id) : '';
      const user = usersResult[patissiereIdStr];
      const rating = ratingsResult[patissiereIdStr];
      const likesCount = likesResult[productIdStr] ?? likesResult[p.id] ?? 0;
      const rawLikerIds = likerIdsResult[productIdStr] ?? likerIdsResult[p.id] ?? [];
      const likedByUserIds = Array.isArray(rawLikerIds) ? rawLikerIds.map((x: any) => String(x)) : [];
      const city = user?.city ?? null;
      const address = user?.address ?? null;
      return {
        ...p,
        likesCount,
        likedByUserIds,
        location: city,
        patissiere: user
          ? {
              id: user.id,
              name: user.name,
              photo: user.photo ?? null,
              city,
              address,
              rating: rating?.average ?? 0,
              ratingCount: rating?.count ?? 0,
            }
          : null,
      };
    });
  }

  private async fetchUsersByIds(ids: string[]): Promise<Record<string, any>> {
    if (ids.length === 0) return {};
    try {
      const response = await lastValueFrom(
        this.authClient.send(AUTH_PATTERNS.FIND_BY_IDS, { ids }).pipe(
          timeout(5000),
          catchError(() => of({ data: { users: {} } })),
        ),
        { defaultValue: { data: { users: {} } } },
      );
      return response?.data?.users ?? {};
    } catch {
      return {};
    }
  }

  private async fetchBatchAverageRatings(userIds: string[]): Promise<Record<string, { average: number; count: number }>> {
    if (userIds.length === 0) return {};
    try {
      const response = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.RATING_BATCH_AVERAGE, { userIds }).pipe(
          timeout(5000),
          catchError(() => of({ data: { ratings: {} } })),
        ),
        { defaultValue: { data: { ratings: {} } } },
      );
      return response?.data?.ratings ?? {};
    } catch {
      return {};
    }
  }

  private async fetchBatchLikeCounts(productIds: string[]): Promise<Record<string, number>> {
    if (productIds.length === 0) return {};
    try {
      const response = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.LIKE_BATCH_COUNT, { productIds }).pipe(
          timeout(5000),
          catchError(() => of({ data: { likes: {} } })),
        ),
        { defaultValue: { data: { likes: {} } } },
      );
      return response?.data?.likes ?? {};
    } catch {
      return {};
    }
  }

  private async fetchBatchLikerIds(productIds: string[]): Promise<Record<string, string[]>> {
    if (productIds.length === 0) return {};
    try {
      const response = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.LIKE_BATCH_LIKER_IDS, { productIds }).pipe(
          timeout(5000),
          catchError(() => of({ data: { likerIds: {} } })),
        ),
        { defaultValue: { data: { likerIds: {} } } },
      );
      return response?.data?.likerIds ?? {};
    } catch {
      return {};
    }
  }

  private toDto(p: any) {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      isActive: p.isActive,
      categoryId: p.categoryId,
      category: p.category,
      images: p.images ?? [],
      ingredients: p.ingredients ?? [],
      personalizationOptions: p.personalizationOptions ?? {},
      patissiereId: p.patissiereId ?? null,
      createdAt: p.createdAt,
    };
  }
}
