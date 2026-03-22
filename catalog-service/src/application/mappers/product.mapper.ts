import { Product } from '../../domain/entities/product.entity';

export interface ProductDto {
  id: string;
  title: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  category?: { id: string; name: string };
  images: string[];
  ingredients: string[];
  personalizationOptions: Record<string, unknown>;
  patissiereId: string | null;
  rating: number;
  createdAt?: Date;
}

export class ProductMapper {
  static toDto(product: Product): ProductDto {
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      isActive: product.isActive,
      categoryId: product.categoryId,
      category: product.category,
      images: product.images,
      ingredients: product.ingredients,
      personalizationOptions: product.personalizationOptions,
      patissiereId: product.patissiereId ?? null,
      rating: product.rating,
      createdAt: product.createdAt,
    };
  }

  static toDtoList(products: Product[]): ProductDto[] {
    return products.map(ProductMapper.toDto);
  }
}
