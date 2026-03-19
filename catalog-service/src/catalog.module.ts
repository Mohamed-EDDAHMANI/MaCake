import { Module } from '@nestjs/common';
import { CatalogDatabaseModule } from './infrastructure/database/catalog-database.module';
import { MessagingModule } from './messaging';
import { ProductController } from './presentation/controllers/product.controller';
import { CategoryController } from './presentation/controllers/category.controller';
import { CreateProductUseCase } from './application/use-cases/product/create-product.use-case';
import { FindAllProductsUseCase } from './application/use-cases/product/find-all-products.use-case';
import { FindOneProductUseCase } from './application/use-cases/product/find-one-product.use-case';
import { UpdateProductUseCase } from './application/use-cases/product/update-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/product/delete-product.use-case';
import { FilterProductsUseCase } from './application/use-cases/product/filter-products.use-case';
import { CreateCategoryUseCase } from './application/use-cases/category/create-category.use-case';
import { FindAllCategoriesUseCase } from './application/use-cases/category/find-all-categories.use-case';
import { FindCategoryByIdUseCase } from './application/use-cases/category/find-category-by-id.use-case';
import { FindCategoryByNameUseCase } from './application/use-cases/category/find-category-by-name.use-case';
import { UpdateCategoryUseCase } from './application/use-cases/category/update-category.use-case';
import { RemoveCategoryUseCase } from './application/use-cases/category/remove-category.use-case';

@Module({
  imports: [CatalogDatabaseModule, MessagingModule],
  controllers: [ProductController, CategoryController],
  providers: [
    CreateProductUseCase,
    FindAllProductsUseCase,
    FindOneProductUseCase,
    UpdateProductUseCase,
    DeleteProductUseCase,
    FilterProductsUseCase,
    CreateCategoryUseCase,
    FindAllCategoriesUseCase,
    FindCategoryByIdUseCase,
    FindCategoryByNameUseCase,
    UpdateCategoryUseCase,
    RemoveCategoryUseCase,
  ],
})
export class CatalogModule {}
