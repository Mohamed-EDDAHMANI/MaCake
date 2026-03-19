import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterProductDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;
}