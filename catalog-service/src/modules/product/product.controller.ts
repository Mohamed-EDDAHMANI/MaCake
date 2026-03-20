import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException, EventPattern } from '@nestjs/microservices';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Logger } from '@nestjs/common';
import { ValidatedBody } from '../../common/decorators/validated-body.decorator';
import { FilterProductDto } from './dto/filter-product.pdo';
import { ServiceError } from '../../common/exceptions';
import { CATALOG_PATTERNS, NOTATION_EVENTS } from '../../messaging';


@Controller()
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_CREATE)
  async create(@ValidatedBody(CreateProductDto) createProductDto: CreateProductDto) {
    this.logger.log(`Creating product: ${createProductDto.title}`);
    const result = await this.productService.create(createProductDto);
    
    if (result instanceof ServiceError) {
      throw new RpcException(result.toJSON());
    }
    
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_FIND_ALL)
  async findAll() {
    this.logger.log('Fetching all products');
    const result = await this.productService.findAll();
    
    if (result instanceof ServiceError) {
      throw new RpcException(result.toJSON());
    }
    
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_FIND_ONE)
  async findOne(@Payload() payload: any) {
    const id = payload.params?.id || payload.id;
    this.logger.log(`Fetching product: ${id}`);
    
    const result = await this.productService.findOne(id);
    
    if (result instanceof ServiceError) {
      throw new RpcException(result.toJSON());
    }
    
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_UPDATE)
  async update(
    @Payload() payload: any,
    @ValidatedBody(UpdateProductDto) updateDto: UpdateProductDto,
  ) {
    const id = payload.params?.id || payload.id;
    this.logger.log(`Updating product: ${id}`);
    
    const result = await this.productService.update(id, updateDto);
    
    if (result instanceof ServiceError) {
      throw new RpcException(result.toJSON());
    }
    
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_DELETE)
  async delete(@Payload() payload: any) {
    const id = payload.params?.id || payload.id;
    const softDelete = payload.softDelete !== false;
    
    const result = await this.productService.delete(id, softDelete);
    
    if (result instanceof ServiceError) {
      throw new RpcException(result.toJSON());
    }
    
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_FIND_BATCH)
  async findBatch(@Payload() payload: any) {
    const ids: string[] = Array.isArray(payload?.ids) ? payload.ids : Array.isArray(payload?.body?.ids) ? payload.body.ids : [];
    const result = await this.productService.findBatch(ids);
    if (result instanceof ServiceError) {
      throw new RpcException(result.toJSON());
    }
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_FILTER)
  async filter(@ValidatedBody(FilterProductDto) filterData: FilterProductDto) {
    this.logger.log('Filtering products');
    
    const result = await this.productService.filter(filterData);
    
    if (result instanceof ServiceError) {
      throw new RpcException(result.toJSON());
    }
    
    return result;
  }

  @EventPattern(CATALOG_PATTERNS.PRODUCT_DEACTIVATE)
  async handleInventoryProductDeleted(@Payload() data: any) {
    this.logger.log(`Received inventory product deletion event: ${JSON.stringify(data)}`);
    
    try {
      // Deactivate the product based on SKU
      const result = await this.productService.deactivateBySku(data.sku);
      
      if (result instanceof ServiceError) {
        this.logger.error(`Failed to deactivate product with SKU ${data.sku}: ${result.message}`);
        return;
      }
      
      this.logger.log(`Product deactivated successfully for SKU: ${data.sku}`);
    } catch (error) {
      this.logger.error(`Error handling inventory product deleted event: ${error.message}`);
    }
  }

  @EventPattern(NOTATION_EVENTS.LIKE_TOGGLED)
  async handleLikeToggled(@Payload() data: { productId: string; likesCount: number }) {
    this.logger.log(`Like toggled for product ${data.productId}: count=${data.likesCount}`);
    try {
      await this.productService.updateLikesCount(data.productId, data.likesCount);
    } catch (error) {
      this.logger.error(`Failed to update likes count: ${error.message}`);
    }
  }
}

