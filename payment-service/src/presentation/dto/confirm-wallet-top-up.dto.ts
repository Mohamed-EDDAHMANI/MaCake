import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmWalletTopUpDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
