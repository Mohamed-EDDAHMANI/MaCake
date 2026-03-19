import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../../../domain/entities/category.entity';
import { ICategoryRepository } from '../../../domain/repositories/category.repository.interface';
import { CategoryDocument } from '../mongoose/schemas/category.schema';

@Injectable()
export class CategoryRepository implements ICategoryRepository {
  constructor(
    @InjectModel('Category') private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(data: { name: string; description: string }): Promise<Category> {
    const doc = await this.categoryModel.create(data);
    return this.toDomain(doc);
  }

  async findById(id: string): Promise<Category | null> {
    const doc = await this.categoryModel.findById(id).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByName(name: string): Promise<Category | null> {
    const doc = await this.categoryModel.findOne({ name }).exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(): Promise<Category[]> {
    const docs = await this.categoryModel.find().exec();
    return docs.map((d) => this.toDomain(d));
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string }>,
  ): Promise<Category | null> {
    const doc = await this.categoryModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async remove(id: string): Promise<boolean> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  private toDomain(doc: CategoryDocument): Category {
    return new Category(
      doc._id.toString(),
      doc.name,
      doc.description ?? '',
      (doc as any).createdAt,
    );
  }
}
