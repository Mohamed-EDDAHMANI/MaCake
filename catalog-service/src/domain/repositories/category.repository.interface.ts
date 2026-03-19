import { Category } from '../entities/category.entity';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface ICategoryRepository {
  create(data: { name: string; description: string }): Promise<Category>;
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  update(id: string, data: Partial<{ name: string; description: string }>): Promise<Category | null>;
  remove(id: string): Promise<boolean>;
}
