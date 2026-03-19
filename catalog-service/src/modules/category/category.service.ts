import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';
import { ServiceError } from '../../common/exceptions';
import { successPayload } from '../../common/types/response-helpers';

function toCategoryDto(doc: CategoryDocument) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    createdAt: (doc as any).createdAt,
  };
}

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      this.logger.log(`Creating category: ${createCategoryDto.name}`);
      const result = await this.categoryModel.create(createCategoryDto);
      this.logger.log(`Category created successfully: ${result._id}`);
      return successPayload('Category created successfully', { category: toCategoryDto(result) }, 201);
    } catch (error: any) {
      if (error.code === 11000) {
        return new ServiceError(
          'CONFLICT',
          `Category with name "${createCategoryDto.name}" already exists`,
          409,
          'catalog-service',
          { field: 'name' },
        );
      }
      this.logger.error(`Failed to create category: ${error.message}`);
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        'Failed to create category',
        500,
        'catalog-service',
        { originalError: error.code },
      );
    }
  }

  /** Internal helper — returns raw document (used by product service for category lookup) */
  async findById(id: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findById(id).exec();
  }

  /** Internal helper — returns raw document */
  async findByName(name: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findOne({ name }).exec();
  }

  async findAll() {
    try {
      const docs = await this.categoryModel.find().exec();
      const categories = docs.map(toCategoryDto);
      return successPayload('Categories fetched successfully', { categories, count: categories.length });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to fetch categories: ${error.message}`, 500, 'catalog-service');
    }
  }

  async findOne(id: string) {
    try {
      const doc = await this.categoryModel.findById(id).exec();
      if (!doc) {
        return new ServiceError('NOT_FOUND', `Category with ID ${id} not found`, 404, 'catalog-service', { resource: 'Category', identifier: id });
      }
      return successPayload('Category fetched successfully', { category: toCategoryDto(doc) });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to fetch category: ${error.message}`, 500, 'catalog-service');
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      const doc = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true }).exec();
      if (!doc) {
        return new ServiceError('NOT_FOUND', `Category with ID ${id} not found`, 404, 'catalog-service', { resource: 'Category', identifier: id });
      }
      return successPayload('Category updated successfully', { category: toCategoryDto(doc) });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to update category: ${error.message}`, 500, 'catalog-service');
    }
  }

  async remove(id: string) {
    try {
      const doc = await this.categoryModel.findByIdAndDelete(id).exec();
      if (!doc) {
        return new ServiceError('NOT_FOUND', `Category with ID ${id} not found`, 404, 'catalog-service', { resource: 'Category', identifier: id });
      }
      return successPayload('Category deleted successfully', { category: toCategoryDto(doc) });
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to delete category: ${error.message}`, 500, 'catalog-service');
    }
  }
}
