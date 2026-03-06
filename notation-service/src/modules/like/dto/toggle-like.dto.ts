import { IsString } from 'class-validator';

export class ToggleLikeDto {
  @IsString()
  userId: string;

  @IsString()
  productId: string;
}
