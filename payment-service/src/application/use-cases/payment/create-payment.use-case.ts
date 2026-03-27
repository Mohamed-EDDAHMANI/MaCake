import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import Stripe from 'stripe';
import { ServiceError } from '../../../common/exceptions';
import { AUTH_CLIENT, ORDERS_CLIENT, ORDERS_PATTERNS } from '../../../messaging/constants';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment.repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../../domain/repositories/transaction.repository.interface';
import type { ITransactionRepository } from '../../../domain/repositories/transaction.repository.interface';
import { COMMISSION_REPOSITORY } from '../../../domain/repositories/commission.repository.interface';
import type { ICommissionRepository } from '../../../domain/repositories/commission.repository.interface';
import { CreatePaymentDto } from '../../../presentation/dto/create-payment.dto';

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: IPaymentRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: ITransactionRepository,
    @Inject(COMMISSION_REPOSITORY) private readonly commissionRepository: ICommissionRepository,
    @Inject(ORDERS_CLIENT) private readonly ordersClient: ClientProxy,
    @Inject(AUTH_CLIENT) private readonly authClient: ClientProxy,
  ) {}

  async execute(dto: CreatePaymentDto, requesterId: string, requesterRole?: string) {
    if (!requesterId) {
      return new ServiceError('UNAUTHORIZED', 'User is required for payment', 401, 'payment-service');
    }

    const order = await this.getOrder(dto.orderId, requesterId, requesterRole);
    if (order instanceof ServiceError) return order;

    const clientId = order.clientId ?? order.userId;
    if (!clientId) {
      return new ServiceError('VALIDATION_ERROR', 'Order has no client id', 400, 'payment-service');
    }

    const amount = Number(order.totalPrice ?? 0);
    if (Number.isNaN(amount) || amount <= 0) {
      return new ServiceError('VALIDATION_ERROR', 'Order amount is invalid', 400, 'payment-service');
    }

    if (dto.paymentMethod === 'wallet') {
      const platformUserId = await this.getPlatformUserId();

      const patissiereId = String(order.patissiereId ?? '');
      if (!patissiereId) {
        return new ServiceError('VALIDATION_ERROR', 'Order has no patissiere id', 400, 'payment-service');
      }

      const debited = await this.debitWalletBalance(clientId, amount);
      if (debited instanceof ServiceError) return debited;

      const platformFee = Number((amount * 0.05).toFixed(2));
      const patissiereNetAmount = Number((amount - platformFee).toFixed(2));

      const creditedPatissiere = await this.topUpWalletBalance(patissiereId, patissiereNetAmount);
      if (creditedPatissiere instanceof ServiceError) {
        // Best-effort compensation to avoid losing client balance if seller credit fails.
        await this.topUpWalletBalance(clientId, amount);
        return new ServiceError(
          'PAYMENT_FAILED',
          'Wallet payment failed while crediting patissiere. Client wallet rollback executed.',
          500,
          'payment-service',
        );
      }

      // Credit platform only if a platform account exists
      if (platformUserId) {
        const creditedPlatform = await this.topUpWalletBalance(platformUserId, platformFee);
        if (creditedPlatform instanceof ServiceError) {
          // Best-effort compensation: debit patissiere net, refund client.
          await this.debitWalletBalance(patissiereId, patissiereNetAmount);
          await this.topUpWalletBalance(clientId, amount);
          return new ServiceError(
            'PAYMENT_FAILED',
            'Wallet payment failed while crediting platform commission. Rollback attempted.',
            500,
            'payment-service',
          );
        }
      }

      const payment = await this.paymentRepository.create({
        orderId: dto.orderId,
        clientId,
        amount,
        paymentMethod: 'wallet',
        // Wallet payment is immediate once balance is available.
        status: 'released',
      });

      const transactionOps: Promise<any>[] = [
        this.transactionRepository.create({
          userId: patissiereId,
          type: 'earning',
          amount: patissiereNetAmount,
          relatedOrderId: dto.orderId,
        }),
        this.commissionRepository.create({
          type: 'order',
          percentage: 5,
        }),
      ];
      if (platformUserId) {
        transactionOps.push(
          this.transactionRepository.create({
            userId: platformUserId,
            type: 'commission',
            amount: platformFee,
            relatedOrderId: dto.orderId,
          }),
        );
      }
      await Promise.allSettled(transactionOps);

      const orderPaymentProgressUpdated = await this.markOrderPaymentInProgress(dto.orderId, clientId);

      return {
        success: true,
        message: 'Wallet payment completed successfully',
        data: {
          payment,
          walletBalance: Number(debited.walletBalance ?? 0),
          patissiereId,
          patissiereWalletBalance: Number(creditedPatissiere.walletBalance ?? 0),
          patissiereNetAmount,
          platformFeeAmount: platformFee,
          orderPaymentProgressUpdated,
        },
        statusCode: 201,
      };
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new ServiceError(
        'CONFIGURATION_ERROR',
        'STRIPE_SECRET_KEY is missing for stripe_card payments',
        500,
        'payment-service',
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    const patissiereId = String(order.patissiereId ?? '');
    if (!patissiereId) {
      return new ServiceError('VALIDATION_ERROR', 'Order has no patissiere id', 400, 'payment-service');
    }

    const stripeCurrency = (this.configService.get<string>('STRIPE_CURRENCY', 'mad') || 'mad').toLowerCase();

    // Direct charge to platform Stripe account (same as wallet top-up).
    // On confirm, patissiere's in-app wallet is credited with 95% of the amount.
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: stripeCurrency,
        customer: dto.stripeCustomerId,
        automatic_payment_methods: { enabled: true },
        description: dto.description ?? `Payment for order ${dto.orderId}`,
        metadata: {
          orderId: dto.orderId,
          clientId,
          patissiereId,
          flow: 'order_payment',
        },
      });
    } catch (error: any) {
      return new ServiceError(
        'PAYMENT_FAILED',
        `Stripe payment failed: ${error?.message ?? 'unknown error'}`,
        400,
        'payment-service',
      );
    }

    const payment = await this.paymentRepository.create({
      orderId: dto.orderId,
      clientId,
      amount,
      paymentMethod: 'stripe_card',
      status: 'blocked',
      stripePaymentIntentId: intent.id,
      stripeCustomerId: dto.stripeCustomerId,
    });

    return {
      success: true,
      message: 'Stripe payment intent created successfully',
      data: {
        payment,
        paymentIntentId: intent.id,
        paymentIntentClientSecret: intent.client_secret,
      },
      statusCode: 201,
    };
  }

  async confirmStripePayment(clientId: string, paymentIntentId: string) {
    if (!paymentIntentId) {
      return new ServiceError('VALIDATION_ERROR', 'paymentIntentId is required', 400, 'payment-service');
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new ServiceError('CONFIGURATION_ERROR', 'STRIPE_SECRET_KEY is missing', 500, 'payment-service');
    }

    const platformStripeAccountId = String(this.configService.get<string>('PLATFORM_USER_ID') ?? '').trim();

    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntentId);
    if (!payment) {
      return new ServiceError('NOT_FOUND', `Payment intent ${paymentIntentId} not found`, 404, 'payment-service');
    }
    if (clientId && payment.clientId !== clientId) {
      return new ServiceError('FORBIDDEN', 'Cannot confirm another user payment', 403, 'payment-service');
    }
    if (payment.status === 'released') {
      return {
        success: true,
        message: 'Payment already confirmed',
        data: { payment },
        statusCode: 200,
      };
    }
    if (payment.status === 'refunded') {
      return new ServiceError('CONFLICT', 'Cannot confirm a refunded payment', 409, 'payment-service');
    }

    const stripe = new Stripe(stripeSecretKey);

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error: any) {
      return new ServiceError(
        'PAYMENT_FAILED',
        `Failed to retrieve payment intent: ${error?.message ?? 'unknown error'}`,
        400,
        'payment-service',
      );
    }

    if (intent.status !== 'succeeded') {
      return new ServiceError('PAYMENT_FAILED', `Payment not completed (status: ${intent.status})`, 400, 'payment-service');
    }

    const requesterId = payment.clientId ?? clientId ?? '';
    if (!requesterId) {
      return new ServiceError('VALIDATION_ERROR', 'Cannot resolve requester id for payment confirmation', 400, 'payment-service');
    }

    const order = await this.getOrder(payment.orderId ?? '', requesterId, 'client');
    if (order instanceof ServiceError) return order;
    const patissiereId = String(order.patissiereId ?? '');
    if (!patissiereId) {
      return new ServiceError('VALIDATION_ERROR', 'Order has no patissiere id', 400, 'payment-service');
    }

    const patissiereNetAmount = Number((payment.amount * 0.95).toFixed(2));
    const platformFeeAmount = Number((payment.amount - patissiereNetAmount).toFixed(2));
    const creditedPatissiere = await this.topUpWalletBalance(patissiereId, patissiereNetAmount);
    if (creditedPatissiere instanceof ServiceError) return creditedPatissiere;

    const updated = await this.paymentRepository.updateById(payment.id, {
      status: 'released',
      stripePaymentIntentId: paymentIntentId,
    });

    await Promise.allSettled([
      this.transactionRepository.create({
        userId: patissiereId,
        type: 'earning',
        amount: patissiereNetAmount,
        relatedOrderId: payment.orderId ?? undefined,
      }),
      this.transactionRepository.create({
        type: 'commission',
        amount: platformFeeAmount,
        relatedOrderId: payment.orderId ?? undefined,
        stripeAccountId: platformStripeAccountId || undefined,
      }),
      this.commissionRepository.create({
        type: 'order',
        percentage: 5,
      }),
    ]);

    const orderPaymentProgressUpdated = await this.markOrderPaymentInProgress(payment.orderId ?? '', requesterId);

    return {
      success: true,
      message: 'Stripe payment confirmed successfully',
      data: {
        payment: updated ?? payment,
        patissiereId,
        patissiereWalletBalance: Number(creditedPatissiere.walletBalance ?? 0),
        patissiereNetAmount,
        platformFeeAmount,
        orderPaymentProgressUpdated,
      },
      statusCode: 200,
    };
  }

  private async markOrderPaymentInProgress(orderId: string, clientId: string): Promise<boolean> {
    if (!orderId || !clientId) {
      return false;
    }

    try {
      const response = await lastValueFrom(
        this.ordersClient.send(ORDERS_PATTERNS.ORDER_UPDATE_STATUS, {
          params: { id: orderId },
          user: { sub: clientId },
        }),
      );
      return Boolean(response?.success ?? response?.data);
    } catch {
      return false;
    }
  }

  private async getOrder(orderId: string, requesterId: string, requesterRole?: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.ordersClient.send('orders/find-one', {
          params: { id: orderId },
          user: {
            sub: requesterId,
            role: requesterRole || 'client',
          },
        }),
      );
      const order = response?.data ?? response;
      if (!order) {
        return new ServiceError('NOT_FOUND', `Order ${orderId} not found`, 404, 'payment-service');
      }
      return order;
    } catch {
      return new ServiceError('NOT_FOUND', `Order ${orderId} not found`, 404, 'payment-service');
    }
  }

  private async debitWalletBalance(clientId: string, amount: number): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.authClient.send('auth/wallet/debit', {
          userId: clientId,
          amount,
        }),
      );
      const data = response?.data ?? response;
      if (!data) {
        return new ServiceError('INTERNAL_SERVER_ERROR', 'Failed to debit wallet balance', 500, 'payment-service');
      }
      return data;
    } catch (error: any) {
      return new ServiceError(
        'PAYMENT_FAILED',
        error?.message || 'Top up your wallet',
        400,
        'payment-service',
      );
    }
  }

  private async topUpWalletBalance(userId: string, amount: number): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.authClient.send('auth/wallet/topup', {
          userId,
          amount,
        }),
      );
      const data = response?.data ?? response;
      if (!data) {
        return new ServiceError('INTERNAL_SERVER_ERROR', 'Failed to top up wallet balance', 500, 'payment-service');
      }
      return data;
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to top up wallet balance',
        500,
        'payment-service',
      );
    }
  }

  private async getPlatformUserId(): Promise<string | null> {
    try {
      const response = await lastValueFrom(this.authClient.send('auth/platform-account', {}));
      const data = response?.data ?? response;
      const platformUserId = data?.user?.id ?? data?.user?._id;
      if (typeof platformUserId === 'string' && platformUserId.trim().length > 0) {
        return platformUserId;
      }
      return null;
    } catch {
      return null;
    }
  }

}
