import { Inject, Injectable, Logger } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import type { IProductRepository } from '../../../domain/repositories/product.repository.interface';
import { CategoryResolverDomainService } from '../../../domain/services/category-resolver.domain-service';
import { Product } from '../../../domain/entities/product.entity';
import { ProductCreatedEvent } from '../../../domain/events';
import { FILE_STORAGE_PORT } from '../../ports/file-storage.port';
import type { IFileStoragePort } from '../../ports/file-storage.port';
import { ProductMapper } from '../../mappers/product.mapper';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

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
    private readonly categoryResolver: CategoryResolverDomainService,
    @Inject(FILE_STORAGE_PORT) private readonly fileStorage: IFileStoragePort,
  ) {}

  async execute(input: CreateProductInput): Promise<ApiResponse<any> | ServiceError> {
    // 1 — Resolve category via domain service (eliminates duplication)
    const categoryId = await this.categoryResolver.resolve(input.categoryId, input.categoryName);
    if (categoryId instanceof ServiceError) return categoryId;

    // 2 — Validate domain invariants via entity factory (Value Objects enforce rules)
    try {
      Product.create({ id: 'validation', title: input.title, description: input.description,
        price: input.price, isActive: input.isActive ?? true, categoryId, patissiereId: input.patissiereId });
    } catch (err: any) {
      return new ServiceError('VALIDATION_ERROR', err.message, 400, 'catalog-service');
    }

    // 3 — Persist (without images to get the real ID first)
    const saved = await this.productRepo.create({
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

    // 4 — Upload images via IFileStoragePort (not S3Service directly)
    if (input.images && input.images.length > 0) {
      const imageUrls = await this.uploadImages(saved.id, input.images, input.imagesMimeTypes);
      if (imageUrls.length > 0) {
        await this.productRepo.update(saved.id, { images: imageUrls });
        (saved as any).images = imageUrls;
      }
    }

    // 5 — Emit domain event (can be wired to EventEmitter2 / RabbitMQ)
    const event = new ProductCreatedEvent(saved.id, input.patissiereId, saved.title, saved.price, categoryId);
    this.logger.log(`[DomainEvent] ${JSON.stringify(event)}`);

    return successPayload('Product created successfully', { product: ProductMapper.toDto(saved) }, 201);
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
