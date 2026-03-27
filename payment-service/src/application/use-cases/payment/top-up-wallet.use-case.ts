import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import Stripe from 'stripe';
import { ServiceError } from '../../../common/exceptions';
import { AUTH_CLIENT } from '../../../messaging/constants';
import { PAYMENT_REPOSITORY } from '../../../domain/repositories/payment.repository.interface';
import type { IPaymentRepository } from '../../../domain/repositories/payment.repository.interface';
import { TopUpWalletDto } from '../../../presentation/dto/top-up-wallet.dto';

@Injectable()
export class TopUpWalletUseCase {
  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: IPaymentRepository,
    @Inject(AUTH_CLIENT) private readonly authClient: ClientProxy,
  ) {}

  async execute(clientId: string, dto: TopUpWalletDto) {
    if (!clientId) {
      return new ServiceError('UNAUTHORIZED', 'User is required for wallet top up', 401, 'payment-service');
    }

    const amount = Number(dto.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new ServiceError('VALIDATION_ERROR', 'amount must be greater than 0', 400, 'payment-service');
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new ServiceError(
        'CONFIGURATION_ERROR',
        'STRIPE_SECRET_KEY is missing for wallet top up',
        500,
        'payment-service',
      );
    }

    const stripe = new Stripe(stripeSecretKey);

    try {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'mad',
        customer: dto.stripeCustomerId,
        automatic_payment_methods: { enabled: true },
        metadata: {
          clientId,
          flow: 'wallet_topup',
          topupAmount: amount.toFixed(2),
        },
      });

      const payment = await this.paymentRepository.create({
        clientId,
        amount,
        paymentMethod: 'stripe_card',
        status: 'blocked',
        stripePaymentIntentId: intent.id,
        stripeCustomerId: dto.stripeCustomerId,
      });

      return {
        success: true,
        message: 'Wallet top up intent created',
        data: {
          payment,
          paymentIntentId: intent.id,
          paymentIntentClientSecret: intent.client_secret,
        },
        statusCode: 201,
      };
    } catch (error: any) {
      return new ServiceError(
        'PAYMENT_FAILED',
        `Stripe top up failed: ${error?.message ?? 'unknown error'}`,
        400,
        'payment-service',
      );
    }
  }

  async confirmWalletTopUp(clientId: string, paymentIntentId: string) {
    if (!clientId) {
      return new ServiceError('UNAUTHORIZED', 'User is required for wallet top up confirmation', 401, 'payment-service');
    }
    if (!paymentIntentId) {
      return new ServiceError('VALIDATION_ERROR', 'paymentIntentId is required', 400, 'payment-service');
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new ServiceError('CONFIGURATION_ERROR', 'STRIPE_SECRET_KEY is missing', 500, 'payment-service');
    }

    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntentId);
    if (!payment) {
      return new ServiceError('NOT_FOUND', `Payment intent ${paymentIntentId} not found`, 404, 'payment-service');
    }
    if (payment.clientId !== clientId) {
      return new ServiceError('FORBIDDEN', 'Cannot confirm another user payment', 403, 'payment-service');
    }
    if (payment.status === 'released') {
      return {
        success: true,
        message: 'Wallet top up already confirmed',
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

    const topUpResult = await this.topUpWalletBalance(payment.clientId, payment.amount);
    if (topUpResult instanceof ServiceError) return topUpResult;

    const updated = await this.paymentRepository.updateById(payment.id, {
      status: 'released',
      stripePaymentIntentId: paymentIntentId,
    });

    return {
      success: true,
      message: 'Wallet topped up successfully',
      data: {
        payment: updated ?? payment,
        walletBalance: Number(topUpResult.walletBalance ?? 0),
      },
      statusCode: 200,
    };
  }

  async releaseWalletTopUp(sessionId: string, stripePaymentIntentId?: string) {
    const payment = await this.paymentRepository.findByStripeCheckoutSessionId(sessionId);
    if (!payment) {
      return new ServiceError('NOT_FOUND', `Top up session ${sessionId} not found`, 404, 'payment-service');
    }

    if (payment.status === 'released') {
      return {
        success: true,
        message: 'Top up already released',
        data: { payment },
        statusCode: 200,
      };
    }

    if (payment.status === 'refunded') {
      return new ServiceError('CONFLICT', 'Cannot release a refunded payment', 409, 'payment-service');
    }

    try {
      const response = await lastValueFrom(
        this.authClient.send('auth/wallet/topup', {
          userId: payment.clientId,
          amount: payment.amount,
        }),
      );
      const data = response?.data ?? response;
      if (!data) {
        return new ServiceError('INTERNAL_SERVER_ERROR', 'Failed to update wallet balance', 500, 'payment-service');
      }

      const updated = await this.paymentRepository.updateById(payment.id, {
        status: 'released',
        stripePaymentIntentId,
      });

      return {
        success: true,
        message: 'Wallet topped up successfully',
        data: {
          payment: updated ?? payment,
          walletBalance: Number(data.walletBalance ?? 0),
        },
        statusCode: 200,
      };
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to update wallet balance',
        500,
        'payment-service',
      );
    }
  }

  private async topUpWalletBalance(clientId: string, amount: number): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.authClient.send('auth/wallet/topup', {
          userId: clientId,
          amount,
        }),
      );
      const data = response?.data ?? response;
      if (!data) {
        return new ServiceError('INTERNAL_SERVER_ERROR', 'Failed to update wallet balance', 500, 'payment-service');
      }
      return data;
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message || 'Failed to update wallet balance',
        500,
        'payment-service',
      );
    }
  }
}
