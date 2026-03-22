import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product } from '../../../domain/entities/product.entity';
import {
  IProductRepository,
  ProductFilter,
} from '../../../domain/repositories/product.repository.interface';
import { ProductDocument } from '../mongoose/schemas/product.schema';

@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(
    @InjectModel('Product') private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(data: {
    title: string;
    description: string;
    price: number;
    isActive: boolean;
    categoryId: string;
    images?: string[];
    personalizationOptions?: Record<string, unknown>;
    patissiereId: string;
  }): Promise<Product> {
    const doc = await this.productModel.create({
      ...data,
      categoryId: new Types.ObjectId(data.categoryId),
      patissiereId: new Types.ObjectId(data.patissiereId),
    });
    const populated = await this.productModel
      .findById(doc._id)
      .populate('categoryId')
      .exec();
    return this.toDomain(populated!);
  }

  async findById(id: string): Promise<Product | null> {
    const doc = await this.productModel
      .findById(id)
      .populate('categoryId')
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findMany(filter: ProductFilter): Promise<Product[]> {
    const where: any = { isActive: filter.isActive ?? true };
    if (filter.categoryId) where.categoryId = new Types.ObjectId(filter.categoryId);
    if (filter.patissiereId) where.patissiereId = new Types.ObjectId(filter.patissiereId);
    if (filter.name) where.title = new RegExp(filter.name, 'i');
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      where.price = {};
      if (filter.minPrice !== undefined) where.price.$gte = filter.minPrice;
      if (filter.maxPrice !== undefined) where.price.$lte = filter.maxPrice;
    }
    const docs = await this.productModel
      .find(where)
      .populate('categoryId')
      .sort({ title: 1 })
      .exec();
    return docs.map((d) => this.toDomain(d));
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      price: number;
      isActive: boolean;
      categoryId: string;
      images: string[];
      personalizationOptions: Record<string, unknown>;
      rating: number;
    }>,
  ): Promise<Product | null> {
    const update: any = { ...data };
    if (data.categoryId) update.categoryId = new Types.ObjectId(data.categoryId);
    const doc = await this.productModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('categoryId')
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async softDelete(id: string): Promise<Product | null> {
    const doc = await this.productModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .populate('categoryId')
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByNamePattern(namePattern: string): Promise<Product | null> {
    const doc = await this.productModel
      .findOne({ title: new RegExp(namePattern, 'i') })
      .populate('categoryId')
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  private toDomain(doc: ProductDocument): Product {
    const obj = doc.toObject() as any;
    const catId = obj.categoryId;
    const categoryIdStr =
      catId && typeof catId === 'object' && '_id' in catId
        ? catId._id.toString()
        : catId?.toString?.() ?? catId;
    const category =
      catId && typeof catId === 'object' && 'name' in catId
        ? { id: catId._id?.toString(), name: catId.name }
        : undefined;
    return Product.reconstitute({
      id: doc._id.toString(),
      title: obj.title ?? obj.name ?? '',
      description: obj.description ?? '',
      price: obj.price,
      isActive: obj.isActive ?? true,
      categoryId: categoryIdStr,
      category,
      createdAt: obj.createdAt,
      images: obj.images,
      personalizationOptions: obj.personalizationOptions,
      ingredients: obj.ingredients ?? [],
      patissiereId: obj.patissiereId?.toString?.() ?? obj.patissiereId,
      rating: obj.rating,
    });
  }
}
