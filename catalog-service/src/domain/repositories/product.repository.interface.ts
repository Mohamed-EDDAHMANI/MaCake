import { Product } from '../entities/product.entity';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductFilter {
  categoryId?: string;
  categoryName?: string;
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  patissiereId?: string;
}

export interface IProductRepository {
  create(data: {
    title: string;
    description: string;
    price: number;
    isActive: boolean;
    categoryId: string;
    images?: string[];
    personalizationOptions?: Record<string, unknown>;
    ingredients?: string[];
    patissiereId: string;
  }): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findMany(filter: ProductFilter): Promise<Product[]>;
  update(
    id: string,
    data: Partial<{ title: string; description: string; price: number; isActive: boolean; categoryId: string; images: string[]; personalizationOptions: Record<string, unknown>; ingredients: string[]; rating: number }>,
  ): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<Product | null>;
  findByNamePattern(namePattern: string): Promise<Product | null>;
}
