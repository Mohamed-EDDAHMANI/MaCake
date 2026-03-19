import { Optional } from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imagesMimeTypes?: string[];

  @IsObject()
  @IsOptional()
  personalizationOptions?: Record<string, unknown>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ingredients?: string[];

  @IsString()
  patissiereId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  categoryName?: string;

  @IsNumber()
  @IsOptional()
  quentity?: number;
}
