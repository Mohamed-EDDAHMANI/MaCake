import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateProductUseCase } from '../../application/use-cases/product/create-product.use-case';
import { FindAllProductsUseCase } from '../../application/use-cases/product/find-all-products.use-case';
import { FindOneProductUseCase } from '../../application/use-cases/product/find-one-product.use-case';
import { UpdateProductUseCase } from '../../application/use-cases/product/update-product.use-case';
import { DeleteProductUseCase } from '../../application/use-cases/product/delete-product.use-case';
import { FilterProductsUseCase } from '../../application/use-cases/product/filter-products.use-case';
import { CreateProductDto } from '../dto/product/create-product.dto';
import { UpdateProductDto } from '../dto/product/update-product.dto';
import { FilterProductDto } from '../dto/product/filter-product.dto';
import { ValidatedBody } from '../../common/decorators/validated-body.decorator';
import { ServiceError } from '../../common/exceptions';
import { CATALOG_PATTERNS } from '../../messaging';

@Controller()
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly findAllProductsUseCase: FindAllProductsUseCase,
    private readonly findOneProductUseCase: FindOneProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly filterProductsUseCase: FilterProductsUseCase,
  ) {}

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_CREATE)
  async create(@ValidatedBody(CreateProductDto) dto: CreateProductDto) {
    const result = await this.createProductUseCase.execute(dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_FIND_ALL)
  async findAll(@Payload() payload: any) {
    const result = await this.findAllProductsUseCase.execute(payload);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_FIND_ONE)
  async findOne(@Payload() payload: any) {
    const id = payload.params?.id || payload.id;
    const result = await this.findOneProductUseCase.execute(id);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_UPDATE)
  async update(@Payload() payload: any, @ValidatedBody(UpdateProductDto) updateDto: UpdateProductDto) {
    const id = payload.params?.id || payload.id || updateDto.id;
    const result = await this.updateProductUseCase.execute(id, updateDto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_DELETE)
  async delete(@Payload() payload: any) {
    const id = payload.params?.id || payload.id;
    const softDelete = payload.softDelete !== false;
    const result = await this.deleteProductUseCase.execute(id, softDelete);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.PRODUCT_FILTER)
  async filter(@ValidatedBody(FilterProductDto) filterData: FilterProductDto) {
    const result = await this.filterProductsUseCase.execute(filterData);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  // NOTE: PRODUCT_DEACTIVATE event has been removed from the catalog service API
  // to keep only the product operations defined in the core ProductService contract.
}
