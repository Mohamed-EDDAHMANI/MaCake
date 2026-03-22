import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateRatingDto {
  @IsString()
  fromUserId: string;

  @IsString()
  toUserId: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  stars: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
