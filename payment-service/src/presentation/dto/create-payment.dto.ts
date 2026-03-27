import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsIn(['stripe_card', 'wallet'])
  paymentMethod: 'stripe_card' | 'wallet';

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  stripeCustomerId?: string;
}
