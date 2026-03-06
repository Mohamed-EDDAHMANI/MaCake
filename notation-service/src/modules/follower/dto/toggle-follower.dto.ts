import { IsString } from 'class-validator';

export class ToggleFollowerDto {
  @IsString()
  clientId: string;

  @IsString()
  patissiereId: string;
}
