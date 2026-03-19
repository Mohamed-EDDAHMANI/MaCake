import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
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
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(filter: FilterProductsInput): Promise<ApiResponse<any> | ServiceError> {
    try {
      let categoryId = filter.categoryId;
      if (!categoryId && (filter.categoryName || filter.category)) {
        const cat = await this.categoryRepo.findByName(filter.categoryName || filter.category!);
        if (cat) categoryId = cat.id;
      }

      const products = await this.productRepo.findMany({
        isActive: true,
        categoryId,
        name: filter.name,
        minPrice: filter.minPrice,
        maxPrice: filter.maxPrice,
      });

      const productDtos = products.map((p) => this.toDto(p));

      return successPayload(
        productDtos.length ? 'Products filtered successfully' : 'No products found matching criteria',
        { products: productDtos, count: productDtos.length, filters: filter },
      );
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to filter products: ${error.message}`,
        500,
        'catalog-service',
        { originalError: error.code },
      );
    }
  }

  private toDto(p: { id: string; title: string; description: string; price: number; isActive: boolean; categoryId: string; category?: { id: string; name: string }; createdAt?: Date }) {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.price,
      isActive: p.isActive,
      categoryId: p.categoryId,
      category: p.category,
      createdAt: p.createdAt,
    };
  }
}
