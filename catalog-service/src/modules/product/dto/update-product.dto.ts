import { PartialType } from '@nestjs/mapped-types';
// import { Optional } from '@nestjs/common';
import { CreateProductDto } from './create-product.dto';
// import { IsBoolean, IsNumber, IsString } from 'class-validator';

interface paramsDto {
  id: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  params: paramsDto;
}
