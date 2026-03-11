import { IsInt, IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomizationDetailsDto {
  @IsOptional()
  @IsString()
  colors?: string;

  @IsOptional()
  @IsString()
  garniture?: string;

  @IsOptional()
  @IsString()
  message?: string;
}

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  priceAtPurchase: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomizationDetailsDto)
  customizationDetails?: CustomizationDetailsDto;
}
