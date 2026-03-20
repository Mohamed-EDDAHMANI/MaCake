import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductDto } from './dto/filter-product.pdo';
import { CategoryService } from '../category/category.service';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout, catchError, of } from 'rxjs';
import { AUTH_CLIENT, AUTH_PATTERNS, NOTATION_CLIENT, NOTATION_PATTERNS } from '../../messaging';
import { ApiResponse } from '../../common/types/api-response';
import { ServiceError } from '../../common/exceptions';
import { Product, ProductDocument } from './schemas/product.schema';
import { S3Service } from '../../s3/s3.service';

function toProductDto(doc: ProductDocument | null): any {
  if (!doc) return null;
  const obj = doc.toObject() as any;
  const catId = obj.categoryId;
  const categoryIdStr =
    catId && typeof catId === 'object' && '_id' in catId ? catId._id.toString() : catId?.toString?.() ?? catId;
  return {
    id: doc._id.toString(),
    title: obj.title,
    description: obj.description,
    price: obj.price,
    images: obj.images ?? [],
    ingredients: obj.ingredients ?? [],
    personalizationOptions: obj.personalizationOptions ?? {},
    patissiereId: obj.patissiereId?.toString() ?? null,
    rating: obj.rating ?? 0,
    likesCount: obj.likesCount ?? 0,
    isActive: obj.isActive,
    createdAt: obj.createdAt,
    categoryId: categoryIdStr,
    category:
      catId && typeof catId === 'object' && 'name' in catId
        ? { id: catId._id?.toString(), name: catId.name }
        : undefined,
  };
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly categoryService: CategoryService,
    private readonly s3Service: S3Service,
    @Inject(AUTH_CLIENT) private readonly authClient: ClientProxy,
    @Inject(NOTATION_CLIENT) private readonly notationClient: ClientProxy,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const { categoryId, categoryName, images, imagesMimeTypes, ...productData } = createProductDto;

    const finalCategoryId = await this.resolveCategoryId(categoryId, categoryName);
    if (finalCategoryId instanceof ServiceError) return finalCategoryId;

    // Create product first (without images) to get the ID
    const product = await this.createProductInDb({ ...productData, images: [] }, finalCategoryId);
    this.logger.log(`Product created successfully: ${product.id}`);

    // Upload base64 images to MinIO
    if (images && images.length > 0) {
      const uploadedPaths = await this.uploadProductImages(product.id, images, imagesMimeTypes);
      if (uploadedPaths.length > 0) {
        await this.productModel.findByIdAndUpdate(product.id, { images: uploadedPaths }).exec();
        product.images = uploadedPaths;
      }
    }

    return { success: true, message: 'Product created successfully', data: { product } };
  }

  /**
   * Upload an array of base64-encoded images to MinIO.
   * Returns an array of relative paths (e.g. /files/catalog/products/{id}/uuid.jpg).
   */
  private async uploadProductImages(
    productId: string,
    base64Images: string[],
    mimeTypes?: string[],
  ): Promise<string[]> {
    const paths: string[] = [];
    for (let i = 0; i < base64Images.length; i++) {
      try {
        const data = base64Images[i];
        if (!data || data.length < 100) continue; // skip empty / non-base64
        const mime = mimeTypes?.[i] || 'image/jpeg';
        const buffer = Buffer.from(data, 'base64');
        const path = await this.s3Service.uploadProductImage(productId, buffer, mime);
        paths.push(path);
      } catch (err: any) {
        this.logger.warn(`Failed to upload image ${i} for product ${productId}: ${err?.message}`);
      }
    }
    return paths;
  }

  private async resolveCategoryId(categoryId?: string, categoryName?: string): Promise<string | ServiceError> {
    if (categoryId) return this.validateCategoryExists(categoryId);
    if (categoryName) return this.getOrCreateCategory(categoryName);
    return new ServiceError(
      'VALIDATION_ERROR',
      'Either categoryId or categoryName must be provided',
      400,
      'catalog-service',
      { provided: { categoryId, categoryName } },
    );
  }

  private async validateCategoryExists(categoryId: string): Promise<string | ServiceError> {
    const category = await this.categoryService.findById(categoryId);
    if (!category) {
      return new ServiceError('NOT_FOUND', `Category with ID ${categoryId} not found`, 404, 'catalog-service', {
        resource: 'Category',
        identifier: categoryId,
      });
    }
    return categoryId;
  }

  private async getOrCreateCategory(categoryName: string): Promise<string | ServiceError> {
    let category = await this.categoryService.findByName(categoryName);
    if (!category) {
      this.logger.log(`Creating new category: ${categoryName}`);
      const result = await this.categoryService.create({
        name: categoryName,
        description: `Auto-created category for ${categoryName}`,
      });
      if (result instanceof ServiceError) return result;
      return result.data!.category.id;
    }
    return category._id.toString();
  }

  private async createProductInDb(productData: any, categoryId: string): Promise<any> {
    const doc = await this.productModel.create({
      ...productData,
      categoryId: new Types.ObjectId(categoryId),
    });
    const populated = await this.productModel.findById(doc._id).populate('categoryId').exec();
    return toProductDto(populated);
  }

  private async rollbackProductCreation(productId: string): Promise<boolean> {
    try {
      await this.productModel.findByIdAndDelete(productId).exec();
      this.logger.log(`Product ${productId} deleted successfully during rollback`);
      return true;
    } catch (error: any) {
      this.logger.error(`Rollback failed for product ${productId}: ${error.message}`, error.stack);
      return false;
    }
  }

  async delete(id: string, softDelete: boolean = true) {
    try {
      const productExists = await this.productModel.findById(id).populate('categoryId').exec();
      if (!productExists) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service', {
          resource: 'Product',
          identifier: id,
        });
      }

      if (softDelete) {
        const updated = await this.productModel
          .findByIdAndUpdate(id, { isActive: false }, { new: true })
          .populate('categoryId')
          .exec();
        return {
          success: true,
          message: 'Product deactivated successfully',
          data: { product: toProductDto(updated) },
        };
      }
      await this.productModel.findByIdAndDelete(id).exec();
      return {
        success: true,
        message: 'Product deleted successfully',
        data: { product: toProductDto(productExists) },
      };
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to remove product: ${error.message}`,
        500,
        'catalog-service',
        { productId: id, originalError: error.code },
      );
    }
  }

  async findAll() {
    try {
      const products = await this.productModel.find({ isActive: true }).populate('categoryId').exec();

      const dtos = products.map((p) => toProductDto(p));
      const enriched = await this.enrichWithPatissiereData(dtos);

      return {
        success: true,
        message: 'Products fetched successfully',
        data: { products: enriched, count: enriched.length },
      };
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to fetch products: ${error.message}`,
        500,
        'catalog-service',
        { originalError: error.code },
      );
    }
  }

  async findOne(id: string) {
    try {
      const product = await this.productModel.findById(id).populate('categoryId').exec();
      if (!product) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service', {
          resource: 'Product',
          identifier: id,
        });
      }
      const dto = toProductDto(product);
      const enriched = await this.enrichWithPatissiereData([dto]);

      return {
        success: true,
        message: 'Product fetched successfully',
        data: { product: enriched[0] },
      };
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to fetch product: ${error.message}`,
        500,
        'catalog-service',
        { productId: id, originalError: error.code },
      );
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    try {
      const existingProduct = await this.productModel.findById(id).exec();
      if (!existingProduct) {
        return new ServiceError('NOT_FOUND', `Product with ID ${id} not found`, 404, 'catalog-service', {
          resource: 'Product',
          identifier: id,
        });
      }

      let categoryId = existingProduct.categoryId;
      if (updateProductDto.categoryId || (updateProductDto as any).categoryName) {
        const resolved = await this.resolveCategoryId(
          updateProductDto.categoryId,
          (updateProductDto as any).categoryName,
        );
        if (resolved instanceof ServiceError) return resolved;
        categoryId = new Types.ObjectId(resolved);
      }

      const { categoryName, categoryId: _cid, ...updateData } = updateProductDto as any;
      const updated = await this.productModel
        .findByIdAndUpdate(id, { ...updateData, categoryId }, { new: true })
        .populate('categoryId')
        .exec();
      return {
        success: true,
        message: 'Product updated successfully',
        data: { product: toProductDto(updated) },
      };
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to update product: ${error.message}`,
        500,
        'catalog-service',
        { productId: id, originalError: error.code },
      );
    }
  }

  async filter(filterData: FilterProductDto) {
    try {
      const where: any = { isActive: true };
      if (filterData.categoryId) where.categoryId = new Types.ObjectId(filterData.categoryId);
      if (filterData.categoryName || filterData.category) {
        const cat = await this.categoryService.findByName(filterData.categoryName || filterData.category!);
        if (cat) where.categoryId = cat._id;
      }
      if (filterData.name) where.name = new RegExp(filterData.name, 'i');
      if (filterData.minPrice !== undefined || filterData.maxPrice !== undefined) {
        where.price = {};
        if (filterData.minPrice !== undefined) where.price.$gte = filterData.minPrice;
        if (filterData.maxPrice !== undefined) where.price.$lte = filterData.maxPrice;
      }

      const products = await this.productModel.find(where).populate('categoryId').sort({ name: 1 }).exec();

      const dtos = products.map((p) => toProductDto(p));
      const enriched = await this.enrichWithPatissiereData(dtos);

      return {
        success: true,
        message: enriched.length ? 'Products filtered successfully' : 'No products found matching criteria',
        data: { products: enriched, count: enriched.length, filters: filterData },
      };
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        `Failed to filter products: ${error.message}`,
        500,
        'catalog-service',
        { originalError: error.code },
      );
    }
  }

  async deactivateBySku(sku: string) {
    try {
      const product = await this.productModel.findOne({ name: new RegExp(sku, 'i') }).exec();
      if (!product) {
        return new ServiceError('NOT_FOUND', `Product with SKU ${sku} not found`, 404, 'catalog-service', {
          resource: 'Product',
          identifier: sku,
        }) as any;
      }
      const updated = await this.productModel
        .findByIdAndUpdate(product._id, { isActive: false }, { new: true })
        .exec();
      return {
        success: true,
        message: 'Product deactivated successfully due to inventory deletion',
        data: toProductDto(updated),
      };
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        'Failed to deactivate product',
        500,
        'catalog-service',
      ) as any;
    }
  }

  /**
   * Batch-enrich product DTOs with patissiere name, photo, and rating.
   * Calls auth-service (findByIds) + notation-service (batch-average) via RabbitMQ.
   */
  private async enrichWithPatissiereData(products: any[]): Promise<any[]> {
    const patissiereIds = [...new Set(products.map((p) => p.patissiereId).filter(Boolean))];
    if (patissiereIds.length === 0) return products;

    // Fetch users and ratings in parallel
    const [usersResult, ratingsResult] = await Promise.all([
      this.fetchUsersByIds(patissiereIds),
      this.fetchBatchAverageRatings(patissiereIds),
    ]);

    return products.map((p) => {
      const user = usersResult[p.patissiereId];
      const rating = ratingsResult[p.patissiereId];
      return {
        ...p,
        patissiere: user
          ? {
              id: user.id,
              name: user.name,
              photo: user.photo ?? null,
              city: user.city ?? null,
              address: user.address ?? null,
              latitude: user.latitude ?? null,
              longitude: user.longitude ?? null,
              rating: rating?.average ?? 0,
              ratingCount: rating?.count ?? 0,
            }
          : null,
      };
    });
  }

  private async fetchUsersByIds(ids: string[]): Promise<Record<string, any>> {
    try {
      const response = await lastValueFrom(
        this.authClient.send(AUTH_PATTERNS.FIND_BY_IDS, { ids }).pipe(
          timeout(5000),
          catchError(() => of({ data: { users: {} } })),
        ),
        { defaultValue: { data: { users: {} } } },
      );
      return response?.data?.users ?? {};
    } catch (err: any) {
      this.logger.warn(`Failed to fetch users from auth-service: ${err?.message}`);
      return {};
    }
  }

  private async fetchBatchAverageRatings(userIds: string[]): Promise<Record<string, { average: number; count: number }>> {
    try {
      const response = await lastValueFrom(
        this.notationClient.send(NOTATION_PATTERNS.RATING_BATCH_AVERAGE, { userIds }).pipe(
          timeout(5000),
          catchError(() => of({ data: { ratings: {} } })),
        ),
        { defaultValue: { data: { ratings: {} } } },
      );
      return response?.data?.ratings ?? {};
    } catch (err: any) {
      this.logger.warn(`Failed to fetch ratings from notation-service: ${err?.message}`);
      return {};
    }
  }

  async findBatch(ids: string[]) {
    try {
      const objectIds = ids.filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
      if (objectIds.length === 0) {
        return { success: true, message: 'No valid ids', data: { products: [] } };
      }
      const docs = await this.productModel
        .find({ _id: { $in: objectIds } }, { title: 1, images: 1 })
        .lean()
        .exec();
      const products = docs.map((d: any) => ({
        id: d._id.toString(),
        title: d.title ?? '',
        image: Array.isArray(d.images) && d.images.length > 0 ? d.images[0] : null,
      }));
      return { success: true, message: 'Batch products fetched', data: { products } };
    } catch (error: any) {
      return new ServiceError('INTERNAL_SERVER_ERROR', `Failed to fetch batch products: ${error.message}`, 500, 'catalog-service');
    }
  }

  async updateLikesCount(productId: string, likesCount: number) {
    await this.productModel.findByIdAndUpdate(productId, { likesCount }).exec();
  }
}
