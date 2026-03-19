import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';
import { S3Service } from '../../../s3/s3.service';

export interface CreateProductInput {
  title: string;
  description: string;
  price: number;
  isActive?: boolean;
  categoryId?: string;
  categoryName?: string;
  images?: string[];
  imagesMimeTypes?: string[];
  personalizationOptions?: Record<string, unknown>;
  ingredients?: string[];
  patissiereId: string;
}

@Injectable()
export class CreateProductUseCase {
  private readonly logger = new Logger(CreateProductUseCase.name);

  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly productRepo: IProductRepository,
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(input: CreateProductInput): Promise<ApiResponse<any> | ServiceError> {
    const categoryId = await this.resolveCategoryId(input.categoryId, input.categoryName);
    if (categoryId instanceof ServiceError) return categoryId;

    // Create the product first (without images) to get an ID
    const product = await this.productRepo.create({
      title: input.title,
      description: input.description,
      price: input.price,
      isActive: input.isActive ?? true,
      categoryId,
      images: [],
      personalizationOptions: input.personalizationOptions,
      ingredients: input.ingredients,
      patissiereId: input.patissiereId,
    });

    // Upload base64 images to MinIO and collect the URLs
    if (input.images && input.images.length > 0) {
      const imageUrls = await this.uploadImages(
        product.id,
        input.images,
        input.imagesMimeTypes,
      );
      if (imageUrls.length > 0) {
        await this.productRepo.update(product.id, { images: imageUrls });
        (product as any).images = imageUrls;
      }
    }

    this.logger.log(`Product created successfully: ${product.id}`);
    return successPayload('Product created successfully', { product: this.toDto(product) });
  }

  /**
   * Upload base64-encoded images to MinIO via S3Service.
   * Returns an array of relative URL paths (/files/catalog/products/...).
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
        // Skip if it's already a URL (not base64)
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
        // Non-blocking: skip failed uploads
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
      let cat = await this.categoryRepo.findByName(categoryName);
      if (!cat) {
        cat = await this.categoryRepo.create({
          name: categoryName,
          description: `Auto-created category for ${categoryName}`,
        });
      }
      return cat.id;
    }
    return new ServiceError(
      'VALIDATION_ERROR',
      'Either categoryId or categoryName must be provided',
      400,
      'catalog-service',
      { provided: { categoryId, categoryName } },
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
