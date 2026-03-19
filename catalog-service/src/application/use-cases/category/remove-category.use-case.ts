import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class RemoveCategoryUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(id: string): Promise<ApiResponse<{ deleted: boolean }> | ServiceError> {
    try {
      const deleted = await this.categoryRepo.remove(id);
      return successPayload(deleted ? 'Category removed successfully' : 'Category not found', { deleted });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to remove category: ${error?.message}`,
        500,
        'catalog-service',
        { identifier: id, originalError: error?.code },
      );
    }
  }
}
