import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ServiceError } from '../../common/exceptions';
import { CATALOG_PATTERNS } from '../../messaging';

@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_CREATE)
  async create(@Payload() createCategoryDto: CreateCategoryDto) {
    const result = await this.categoryService.create(createCategoryDto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_FIND_ALL)
  async findAll() {
    const result = await this.categoryService.findAll();
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_FIND_ONE)
  async findOne(@Payload() id: string) {
    const result = await this.categoryService.findOne(id);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_UPDATE)
  async update(@Payload() updateCategoryDto: UpdateCategoryDto) {
    const result = await this.categoryService.update(String(updateCategoryDto.id), updateCategoryDto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(CATALOG_PATTERNS.CATEGORY_REMOVE)
  async remove(@Payload() id: string) {
    const result = await this.categoryService.remove(id);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
