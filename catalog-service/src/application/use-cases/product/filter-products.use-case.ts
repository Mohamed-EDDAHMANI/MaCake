import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { CategoryResolverDomainService } from '../../../domain/services/category-resolver.domain-service';
import { ProductMapper } from '../../mappers/product.mapper';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

export interface FilterProductsInput {
  categoryId?: string;
  categoryName?: string;
  category?: string;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
}

@Injectable()
export class FilterProductsUseCase {
  private readonly logger = new Logger(FilterProductsUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    private readonly categoryResolver: CategoryResolverDomainService,
  ) {}

  async execute(filter: FilterProductsInput): Promise<ApiResponse<any> | ServiceError> {
    try {
      let categoryId = filter.categoryId;

      if (!categoryId && (filter.categoryName || filter.category)) {
        const resolved = await this.categoryResolver.resolve(undefined, filter.categoryName ?? filter.category);
        // If category not found just filter without it (non-blocking)
        if (!(resolved instanceof ServiceError)) categoryId = resolved;
      }

      const products = await this.productRepo.findMany({
        isActive: true,
        categoryId,
        name: filter.name,
        minPrice: filter.minPrice,
        maxPrice: filter.maxPrice,
      });

      const dtos = ProductMapper.toDtoList(products);

      return successPayload(
        dtos.length ? 'Products filtered successfully' : 'No products found matching criteria',
        { products: dtos, count: dtos.length, filters: filter },
      );
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to filter products: ${error.message}`, 500,
        'catalog-service', { originalError: error.code });
    }
  }
}
