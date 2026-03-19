import { Inject, Injectable } from '@nestjs/common';
import { CATEGORY_REPOSITORY } from '../../../domain/repositories/category.repository.interface';
import type { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';

@Injectable()
export class FindCategoryByNameUseCase {
  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categoryRepo: ICategoryRepository,
  ) {}

  async execute(name: string) {
    return this.categoryRepo.findByName(name);
  }
}
