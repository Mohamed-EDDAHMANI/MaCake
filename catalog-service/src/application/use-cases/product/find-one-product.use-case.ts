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
export class FindOneProductUseCase {
  private readonly logger = new Logger(FindOneProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(AUTH_CLIENT) private readonly authClient: ClientProxy,
    @Inject(NOTATION_CLIENT) private readonly notationClient: ClientProxy,
  ) {}

  async execute(id: string): Promise<ApiResponse<any> | ServiceError> {
    try {
      const product = await this.productRepo.findById(id);
      if (!product) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service',
          { resource: 'Product', identifier: id });
      }

      const dto = ProductMapper.toDto(product);
      const enriched = await this.enrichProduct(dto);

      return successPayload('Product fetched successfully', { product: enriched });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to fetch product: ${error.message}`, 500,
        'catalog-service', { productId: id, originalError: error.code });
    }
  }

  private async enrichProduct(product: any): Promise<any> {
    const [usersResult, ratingsResult, likesResult] = await Promise.all([
      product.patissiereId ? this.fetchUsersByIds([product.patissiereId]) : Promise.resolve({}),
      product.patissiereId ? this.fetchBatchAverageRatings([product.patissiereId]) : Promise.resolve({}),
      product.id ? this.fetchBatchLikeCounts([product.id]) : Promise.resolve({}),
    ]);

    const user = usersResult[product.patissiereId];
    const rating = ratingsResult[product.patissiereId];
    return {
      ...product,
      likesCount: likesResult[product.id] ?? 0,
      patissiere: user
        ? { id: user.id, name: user.name, photo: user.photo ?? null,
            rating: rating?.average ?? 0, ratingCount: rating?.count ?? 0 }
        : null,
    };
  }

  private async fetchUsersByIds(ids: string[]): Promise<Record<string, any>> {
    try {
      const res = await lastValueFrom(
        this.authClient.send(AUTH_PATTERNS.FIND_BY_IDS, { ids }).pipe(timeout(5000), catchError(() => of({ data: { users: {} } }))),
        { defaultValue: { data: { users: {} } } },
      );
      return res?.data?.users ?? {};
    } catch { return {}; }
  }

  private async fetchBatchAverageRatings(userIds: string[]): Promise<Record<string, { average: number; count: number }>> {
    try {
      const res = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.RATING_BATCH_AVERAGE, { userIds }).pipe(timeout(5000), catchError(() => of({ data: { ratings: {} } }))),
        { defaultValue: { data: { ratings: {} } } },
      );
      return res?.data?.ratings ?? {};
    } catch { return {}; }
  }

  private async fetchBatchLikeCounts(productIds: string[]): Promise<Record<string, number>> {
    try {
      const res = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.LIKE_BATCH_COUNT, { productIds }).pipe(timeout(5000), catchError(() => of({ data: { likes: {} } }))),
        { defaultValue: { data: { likes: {} } } },
      );
      return res?.data?.likes ?? {};
    } catch { return {}; }
  }
}
