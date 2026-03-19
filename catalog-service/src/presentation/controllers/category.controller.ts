import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CreateCategoryUseCase } from '../../application/use-cases/category/create-category.use-case';
import { FindAllCategoriesUseCase } from '../../application/use-cases/category/find-all-categories.use-case';
import { FindCategoryByIdUseCase } from '../../application/use-cases/category/find-category-by-id.use-case';
import { UpdateCategoryUseCase } from '../../application/use-cases/category/update-category.use-case';
import { RemoveCategoryUseCase } from '../../application/use-cases/category/remove-category.use-case';
import { CreateCategoryDto } from '../dto/category/create-category.dto';
import { UpdateCategoryDto } from '../dto/category/update-category.dto';
import { ServiceError } from '../../common/exceptions';
import { CATALOG_PATTERNS } from '../../messaging';

@Controller()
export class CategoryController {
  constructor(
    private readonly createCategoryUseCase: CreateCategoryUseCase,
    private readonly findAllCategoriesUseCase: FindAllCategoriesUseCase,
    private readonly findCategoryByIdUseCase: FindCategoryByIdUseCase,
    private readonly updateCategoryUseCase: UpdateCategoryUseCase,
    private readonly removeCategoryUseCase: RemoveCategoryUseCase,
  ) {}

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_CREATE)
  async create(@Payload() dto: CreateCategoryDto) {
    const result = await this.createCategoryUseCase.execute(dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_FIND_ALL)
  async findAll() {
    const result = await this.findAllCategoriesUseCase.execute();
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_FIND_ONE)
  async findOne(@Payload() payload: any) {
    const id = payload?.id ?? payload?.params?.id;
    const result = await this.findCategoryByIdUseCase.execute(id);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_UPDATE)
  async update(@Payload() payload: UpdateCategoryDto) {
    const id = payload.id ?? (payload as any).params?.id;
    const { id: _id, ...data } = payload as any;
    const result = await this.updateCategoryUseCase.execute(id, data);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_REMOVE)
  async remove(@Payload() payload: any) {
    const id = payload?.id ?? payload?.params?.id;
    const result = await this.removeCategoryUseCase.execute(id);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
