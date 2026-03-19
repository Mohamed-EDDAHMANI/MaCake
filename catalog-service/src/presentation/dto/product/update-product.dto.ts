import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';

interface ParamsDto {
  id: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  params?: ParamsDto;
  id?: string;
}
