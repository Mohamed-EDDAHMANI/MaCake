import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';
import { S3Service } from '../../../s3/s3.service';

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
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(id: string, input: UpdateProductInput): Promise<ApiResponse<any> | ServiceError> {
    try {
      const existing = await this.productRepo.findById(id);
      if (!existing) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service', {
          resource: 'Product',
          identifier: id,
        });
      }

      let categoryId = existing.categoryId;
      if (input.categoryId || input.categoryName) {
        const resolved = await this.resolveCategoryId(input.categoryId, input.categoryName);
        if (resolved instanceof ServiceError) return resolved;
        categoryId = resolved;
      }

      // Upload new base64 images to MinIO if provided
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
      return successPayload('Product updated successfully', { product: this.toDto(updated) });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to update product: ${error.message}`,
        500,
        'catalog-service',
        { productId: id, originalError: error.code },
      );
    }
  }

  /**
   * Upload base64-encoded images to MinIO via S3Service.
   */
  private async uploadImages(
    productId: string,
    base64Images: string[],
    mimeTypes?: string[],
  ): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < base64Images.length; i++) {
      try {
        const raw = base64Images[i];
        if (raw.startsWith('/files/') || raw.startsWith('http')) {
          urls.push(raw);
          continue;
        }
        const mime = mimeTypes?.[i] || 'image/jpeg';
        const buffer = Buffer.from(raw, 'base64');
        const url = await this.s3Service.uploadProductImage(productId, buffer, mime);
        urls.push(url);
      } catch (err: any) {
        this.logger.warn(`Failed to upload image ${i} for product ${productId}: ${err?.message}`);
      }
    }
    return urls;
  }

  private async resolveCategoryId(categoryId?: string, categoryName?: string): Promise<string | ServiceError> {
    if (categoryId) {
      const cat = await this.categoryRepo.findById(categoryId);
      if (!cat) {
        return new ServiceError('NOT_FOUND', `Category with ID ${categoryId} not found`, 404, 'catalog-service', {
          resource: 'Category',
          identifier: categoryId,
        });
      }
      return categoryId;
    }
    if (categoryName) {
      const cat = await this.categoryRepo.findByName(categoryName);
      if (!cat) {
        const created = await this.categoryRepo.create({
          name: categoryName,
          description: `Auto-created category for ${categoryName}`,
        });
        return created.id;
      }
      return cat.id;
    }
    return new ServiceError(
      'VALIDATION_ERROR',
      'Either categoryId or categoryName must be provided',
      400,
      'catalog-service',
    );
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
