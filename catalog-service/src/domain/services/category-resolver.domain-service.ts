import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../repositories/category.repository.interface';
import type { ICategoryRepository } from '../repositories/category.repository.interface';
import { ServiceError } from '../../common/exceptions';

/**
 * Domain Service — encapsulates the business rule for resolving a category
 * from either an explicit ID or a name (auto-creating if it doesn't exist).
 * Extracted from use cases to eliminate duplication.
 */
@Injectable()
export class CategoryResolverDomainService {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepo: ICategoryRepository,
  ) {}

  async resolve(categoryId?: string, categoryName?: string): Promise<string | ServiceError> {
    if (categoryId) {
      return this.validateById(categoryId);
    }
    if (categoryName) {
      return this.getOrCreate(categoryName);
    }
    return new ServiceError(
      'VALIDATION_ERROR',
      'Either categoryId or categoryName must be provided.',
      400,
      'catalog-service',
    );
  }

  private async validateById(categoryId: string): Promise<string | ServiceError> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      return new ServiceError(
        'NOT_FOUND',
        `Category with ID ${categoryId} not found.`,
        404,
        'catalog-service',
        { resource: 'Category', identifier: categoryId },
      );
    }
    return categoryId;
  }

  private async getOrCreate(categoryName: string): Promise<string | ServiceError> {
    const existing = await this.categoryRepo.findByName(categoryName);
    if (existing) return existing.id;
    const created = await this.categoryRepo.create({
      name: categoryName,
      description: `Auto-created category for ${categoryName}`,
    });
    return created.id;
  }
}
