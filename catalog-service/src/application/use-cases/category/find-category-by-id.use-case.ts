import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class FindCategoryByIdUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(id: string): Promise<ApiResponse<any> | ServiceError> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      return new ServiceError('NOT_FOUND', `Category with ID ${id} not found`, 404, 'catalog-service', {
        resource: 'Category',
        identifier: id,
      });
    }
    return successPayload('Category fetched successfully', {
      id: category.id,
      name: category.name,
      description: category.description ?? '',
    });
  }
}
