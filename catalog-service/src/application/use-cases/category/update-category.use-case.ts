import { Inject, Injectable, Logger } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { ServiceError } from '../../../common/exceptions';
import { ApiResponse, successPayload } from '../../../common/types/response-helpers';

@Injectable()
export class UpdateCategoryUseCase {
  private readonly logger = new Logger(UpdateCategoryUseCase.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(
    id: string,
    input: Partial<{ name: string; description: string }>,
  ): Promise<ApiResponse<any> | ServiceError> {
    const updated = await this.categoryRepo.update(id, input);
    if (!updated) {
      return new ServiceError('NOT_FOUND', `Category with ID ${id} not found`, 404, 'catalog-service', {
        resource: 'Category',
        identifier: id,
      });
    }
    return successPayload('Category updated successfully', {
      id: updated.id,
      name: updated.name,
      description: updated.description,
    });
  }
}
