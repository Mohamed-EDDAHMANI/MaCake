import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ServiceError } from '../../common/exceptions';
import { PAYMENT_PATTERNS } from '../../messaging/constants';
import { ValidatedBody } from '../../common/decorators/validated-body.decorator';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { CreateDeliveryPaymentDto } from '../dto/create-delivery-payment.dto';
import { CreatePaymentUseCase } from '../../application/use-cases/payment/create-payment.use-case';
import { CreateDeliveryPaymentUseCase } from '../../application/use-cases/payment/create-delivery-payment.use-case';
import { TopUpWalletDto } from '../dto/top-up-wallet.dto';
import { ConfirmWalletTopUpDto } from '../dto/confirm-wallet-top-up.dto';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { TopUpWalletUseCase } from '../../application/use-cases/payment/top-up-wallet.use-case';
import { StripeWalletWebhookUseCase } from '../../application/use-cases/payment/stripe-wallet-webhook.use-case';

@Controller()
export class PaymentController {
  constructor(
    private readonly createPaymentUseCase: CreatePaymentUseCase,
    private readonly createDeliveryPaymentUseCase: CreateDeliveryPaymentUseCase,
    private readonly topUpWalletUseCase: TopUpWalletUseCase,
    private readonly stripeWalletWebhookUseCase: StripeWalletWebhookUseCase,
  ) {}

  @MessagePattern(PAYMENT_PATTERNS.CREATE)
  async create(
    @Payload() payload: { user?: { id?: string; sub?: string; role?: string } },
    @ValidatedBody(CreatePaymentDto) dto: CreatePaymentDto,
  ) {
    const requesterId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const requesterRole = payload?.user?.role ?? '';
    const result = await this.createPaymentUseCase.execute(dto, requesterId, requesterRole);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern(PAYMENT_PATTERNS.CREATE_DELIVERY)
  async createDelivery(
    @Payload() payload: { user?: { id?: string; sub?: string } },
    @ValidatedBody(CreateDeliveryPaymentDto) dto: CreateDeliveryPaymentDto,
  ) {
    const requesterId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const result = await this.createDeliveryPaymentUseCase.execute(dto, requesterId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('payment/delivery-confirm')
  async confirmDeliveryPayment(
    @Payload() payload: { user?: { id?: string; sub?: string } },
    @ValidatedBody(ConfirmPaymentDto) dto: ConfirmPaymentDto,
  ) {
    const clientId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const result = await this.createDeliveryPaymentUseCase.confirmStripeDeliveryPayment(clientId, dto.paymentIntentId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('payement/create')
  async createLegacy(
    @Payload() payload: { body?: CreatePaymentDto; user?: { id?: string; sub?: string; role?: string } },
  ) {
    const dto = payload?.body ?? (payload as unknown as CreatePaymentDto);
    const requesterId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const requesterRole = payload?.user?.role ?? '';
    const result = await this.createPaymentUseCase.execute(dto, requesterId, requesterRole);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('payment/confirm')
  async confirmOrderPayment(
    @Payload() payload: { user?: { id?: string; sub?: string } },
    @ValidatedBody(ConfirmPaymentDto) dto: ConfirmPaymentDto,
  ) {
    const clientId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const result = await this.createPaymentUseCase.confirmStripePayment(clientId, dto.paymentIntentId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('wallet/intent')
  async createWalletIntent(
    @Payload() payload: { user?: { id?: string; sub?: string } },
    @ValidatedBody(TopUpWalletDto) dto: TopUpWalletDto,
  ) {
    const clientId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const result = await this.topUpWalletUseCase.execute(clientId, dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('wallet/topup')
  async createWalletCheckoutLegacy(
    @Payload() payload: { user?: { id?: string; sub?: string } },
    @ValidatedBody(TopUpWalletDto) dto: TopUpWalletDto,
  ) {
    const clientId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const result = await this.topUpWalletUseCase.execute(clientId, dto);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('wallet/confirm')
  async confirmWalletTopUp(
    @Payload() payload: { user?: { id?: string; sub?: string } },
    @ValidatedBody(ConfirmWalletTopUpDto) dto: ConfirmWalletTopUpDto,
  ) {
    const clientId = payload?.user?.id ?? payload?.user?.sub ?? '';
    const result = await this.topUpWalletUseCase.confirmWalletTopUp(clientId, dto.paymentIntentId);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }

  @MessagePattern('wallet/webhook')
  async walletWebhook(@Payload() payload: any) {
    const result = await this.stripeWalletWebhookUseCase.execute(payload?.body ?? payload);
    if (result instanceof ServiceError) throw new RpcException(result.toJSON());
    return result;
  }
}
