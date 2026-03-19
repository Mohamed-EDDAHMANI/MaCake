import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { CategoryModule } from '../category/category.module';
import { Product, ProductSchema } from './schemas/product.schema';
import { MessagingModule } from '../../messaging';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    CategoryModule,
    MessagingModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
