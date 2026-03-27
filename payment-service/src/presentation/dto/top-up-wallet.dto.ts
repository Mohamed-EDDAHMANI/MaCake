import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TopUpWalletDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  stripeCustomerId?: string;
}
