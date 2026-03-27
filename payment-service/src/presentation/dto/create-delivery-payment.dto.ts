import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryPaymentDto {
  @IsString()
  @IsNotEmpty()
  estimationId: string;

  @IsString()
  @IsIn(['stripe_card', 'wallet'])
  paymentMethod: 'stripe_card' | 'wallet';

  @IsString()
  @IsOptional()
  stripeCustomerId?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
