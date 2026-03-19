import { Inject, Injectable, Logger } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

export interface CreateCategoryInput {
  name: string;
  description: string;
}

@Injectable()
export class CreateCategoryUseCase {
  private readonly logger = new Logger(CreateCategoryUseCase.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(input: CreateCategoryInput): Promise<ApiResponse<any> | ServiceError> {
    try {
      const category = await this.categoryRepo.create(input);
      return successPayload('Category created successfully', {
        id: category.id,
        name: category.name,
        description: category.description,
      });
    } catch (error: any) {
      if (error.code === 11000) {
        return new ServiceError(
          'CONFLICT',
          `Category with name "${input.name}" already exists`,
          409,
          'catalog-service',
          { field: 'name' },
        );
      }
      this.logger.error(`Failed to create category: ${error.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        'Failed to create category',
        500,
        'catalog-service',
        { originalError: error.code },
      );
    }
  }
}
