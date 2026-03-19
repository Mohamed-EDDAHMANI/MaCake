import { IsString, IsNumber } from 'class-validator';

export class UpdateCategoryDto {
  @IsNumber()
  id: number;
  
  @IsString()
  NewName: string;
}
