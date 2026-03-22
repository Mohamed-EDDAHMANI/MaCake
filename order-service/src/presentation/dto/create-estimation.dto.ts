import { IsString, IsNumber, IsMongoId, Min } from 'class-validator';

export class CreateEstimationDto {
  @IsMongoId()
  orderId: string;

  @IsString()
  details: string;

  @IsNumber()
  @Min(0)
  price: number;
}
