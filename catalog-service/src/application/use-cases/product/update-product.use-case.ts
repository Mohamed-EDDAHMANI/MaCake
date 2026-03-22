import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { CategoryResolverDomainService } from '../../../domain/services/category-resolver.domain-service';
import { ProductUpdatedEvent } from '../../../domain/events';
import { FILE_STORAGE_PORT } from '../../ports/file-storage.port';
import type { IFileStoragePort } from '../../ports/file-storage.port';
import { ProductMapper } from '../../mappers/product.mapper';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

export interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  categoryId?: string;
  categoryName?: string;
  images?: string[];
  imagesMimeTypes?: string[];
}

@Injectable()
export class UpdateProductUseCase {
  private readonly logger = new Logger(UpdateProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    private readonly categoryResolver: CategoryResolverDomainService,
    @Inject(FILE_STORAGE_PORT) private readonly fileStorage: IFileStoragePort,
  ) {}

  async execute(id: string, input: UpdateProductInput): Promise<ApiResponse<any> | ServiceError> {
    try {
      const existing = await this.productRepo.findById(id);
      if (!existing) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service',
          { resource: 'Product', identifier: id });
      }

      let categoryId = existing.categoryId;
      if (input.categoryId || input.categoryName) {
        const resolved = await this.categoryResolver.resolve(input.categoryId, input.categoryName);
        if (resolved instanceof ServiceError) return resolved;
        categoryId = resolved;
      }

      let imageUrls: string[] | undefined;
      if (input.images && input.images.length > 0) {
        imageUrls = await this.uploadImages(id, input.images, input.imagesMimeTypes);
      }

      const updated = await this.productRepo.update(id, {
        title: input.title,
        description: input.description,
        price: input.price,
        isActive: input.isActive,
        categoryId,
        ...(imageUrls ? { images: imageUrls } : {}),
      });

      if (!updated) {
        return new ServiceError('INTERNAL_SERVER_ERROR', 'Update failed', 500, 'catalog-service');
      }

      const updatedFields = Object.keys(input).filter((k) => (input as any)[k] !== undefined);
      const event = new ProductUpdatedEvent(id, updatedFields);
      this.logger.log(`[DomainEvent] ${JSON.stringify(event)}`);

      return successPayload('Product updated successfully', { product: ProductMapper.toDto(updated) });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to update product: ${error.message}`, 500,
        'catalog-service', { productId: id, originalError: error.code });
    }
  }

  private async uploadImages(productId: string, base64Images: string[], mimeTypes?: string[]): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < base64Images.length; i++) {
      try {
        const raw = base64Images[i];
        if (raw.startsWith('/files/') || raw.startsWith('http')) { urls.push(raw); continue; }
        const url = await this.fileStorage.uploadProductImage(productId, Buffer.from(raw, 'base64'), mimeTypes?.[i] ?? 'image/jpeg');
        urls.push(url);
      } catch (err: any) {
        this.logger.warn(`Failed to upload image ${i} for product ${productId}: ${err?.message}`);
      }
    }
    return urls;
  }
}
