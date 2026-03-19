import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class FindAllCategoriesUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(): Promise<ApiResponse<any> | ServiceError> {
    try {
      const categories = await this.categoryRepo.findAll();
      return successPayload('Categories fetched successfully', { categories });
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to fetch categories: ${error?.message}`,
        500,
        'catalog-service',
        { originalError: error?.code },
      );
    }
  }
}
