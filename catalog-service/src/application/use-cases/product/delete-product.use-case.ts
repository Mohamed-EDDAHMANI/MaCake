import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class DeleteProductUseCase {
  private readonly logger = new Logger(DeleteProductUseCase.name);

  constructor(@Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository) {}

  async execute(id: string, softDelete: boolean = true): Promise<ApiResponse<any> | ServiceError> {
    try {
      const product = await this.productRepo.findById(id);
      if (!product) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service', {
          resource: 'Product',
          identifier: id,
        });
      }

      if (softDelete) {
        const updated = await this.productRepo.softDelete(id);
        return successPayload('Product deactivated successfully', { product: this.toDto(updated!) });
      }
      await this.productRepo.delete(id);
      return successPayload('Product deleted successfully', { product: this.toDto(product) });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to remove product: ${error.message}`,
        500,
        'catalog-service',
        { productId: id, originalError: error.code },
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
