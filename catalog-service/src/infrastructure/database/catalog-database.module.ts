import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDbModule } from '../../database/mongodb.module';
import { CategoryRepository } from './repositories/category.repository';
import { ProductRepository } from './repositories/product.repository';
import { CATEGORY_REPOSITORY } from '../../domain/repositories/category.repository.interface';
import { PRODUCT_REPOSITORY } from '../../domain/repositories/product.repository.interface';
import { CategorySchemaFactory } from './mongoose/schemas/category.schema';
import { ProductSchemaFactory } from './mongoose/schemas/product.schema';

@Module({
  imports: [
    MongoDbModule,
    MongooseModule.forFeature([
      { name: 'Category', schema: CategorySchemaFactory },
      { name: 'Product', schema: ProductSchemaFactory },
    ]),
  ],
  providers: [
    CategoryRepository,
    ProductRepository,
    { provide: CATEGORY_REPOSITORY, useExisting: CategoryRepository },
    { provide: PRODUCT_REPOSITORY, useExisting: ProductRepository },
  ],
  exports: [CATEGORY_REPOSITORY, PRODUCT_REPOSITORY],
})
export class CatalogDatabaseModule {}
