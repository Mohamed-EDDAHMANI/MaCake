import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { ProductDeletedEvent } from '../../../domain/events';
import { ProductMapper } from '../../mappers/product.mapper';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class DeleteProductUseCase {
  private readonly logger = new Logger(DeleteProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
  ) {}

  async execute(id: string, softDelete = true): Promise<ApiResponse<any> | ServiceError> {
    try {
      const product = await this.productRepo.findById(id);
      if (!product) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service',
          { resource: 'Product', identifier: id });
      }

      if (softDelete) {
        const updated = await this.productRepo.softDelete(id);
        const event = new ProductDeletedEvent(id, true);
        this.logger.log(`[DomainEvent] ${JSON.stringify(event)}`);
        return successPayload('Product deactivated successfully', { product: ProductMapper.toDto(updated!) });
      }

      await this.productRepo.delete(id);
      const event = new ProductDeletedEvent(id, false);
      this.logger.log(`[DomainEvent] ${JSON.stringify(event)}`);
      return successPayload('Product deleted successfully', { product: ProductMapper.toDto(product) });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to remove product: ${error.message}`, 500,
        'catalog-service', { productId: id, originalError: error.code });
    }
  }
}
