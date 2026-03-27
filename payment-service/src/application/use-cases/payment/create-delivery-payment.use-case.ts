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
import { CreateDeliveryPaymentDto } from '../../../presentation/dto/create-delivery-payment.dto';

@Injectable()
export class CreateDeliveryPaymentUseCase {
  constructor(
    private readonly configService: ConfigService,
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: IPaymentRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly transactionRepository: ITransactionRepository,
    @Inject(COMMISSION_REPOSITORY) private readonly commissionRepository: ICommissionRepository,
    @Inject(ORDERS_CLIENT) private readonly ordersClient: ClientProxy,
    @Inject(AUTH_CLIENT) private readonly authClient: ClientProxy,
  ) {}

  async execute(dto: CreateDeliveryPaymentDto, requesterId: string) {
    if (!requesterId) {
      return new ServiceError('UNAUTHORIZED', 'User is required for delivery payment', 401, 'payment-service');
    }

    const estimation = await this.getEstimation(dto.estimationId);
    if (estimation instanceof ServiceError) return estimation;

    const deliveryUserId = estimation.acceptedBy ?? estimation.createdBy;
    if (!deliveryUserId) {
      return new ServiceError('VALIDATION_ERROR', 'Estimation has no delivery user', 400, 'payment-service');
    }

    const order = await this.getOrder(estimation.orderId, requesterId);
    if (order instanceof ServiceError) return order;

    const clientId = order.clientId ?? order.userId;
    if (!clientId || clientId !== requesterId) {
      return new ServiceError('FORBIDDEN', 'Only the order client can pay the delivery fee', 403, 'payment-service');
    }

    const amount = Number(estimation.price);
    if (Number.isNaN(amount) || amount <= 0) {
      return new ServiceError('VALIDATION_ERROR', 'Estimation amount is invalid', 400, 'payment-service');
    }

    if (dto.paymentMethod === 'wallet') {
      const platformUserId = await this.getPlatformUserId();

      const debited = await this.debitWalletBalance(clientId, amount);
      if (debited instanceof ServiceError) return debited;

      const deliveryNetAmount = Number((amount * 0.95).toFixed(2));
      const platformFeeAmount = Number((amount - deliveryNetAmount).toFixed(2));
      const creditedDelivery = await this.topUpWalletBalance(deliveryUserId, deliveryNetAmount);
      if (creditedDelivery instanceof ServiceError) {
        await this.topUpWalletBalance(clientId, amount);
        return new ServiceError(
          'PAYMENT_FAILED',
          'Wallet payment failed while crediting delivery. Client wallet rollback executed.',
          500,
          'payment-service',
        );
      }

      // Credit platform only if a platform account exists
      if (platformUserId) {
        const creditedPlatform = await this.topUpWalletBalance(platformUserId, platformFeeAmount);
        if (creditedPlatform instanceof ServiceError) {
          await this.debitWalletBalance(deliveryUserId, deliveryNetAmount);
          await this.topUpWalletBalance(clientId, amount);
          return new ServiceError(
            'PAYMENT_FAILED',
            'Wallet delivery payment failed while crediting platform commission. Rollback attempted.',
            500,
            'payment-service',
          );
        }
      }

      const payment = await this.paymentRepository.create({
        orderId: estimation.orderId,
        estimationId: dto.estimationId,
        clientId,
        amount,
        paymentMethod: 'wallet',
        status: 'released',
      });

      const transactionOps: Promise<any>[] = [
        this.transactionRepository.create({
          userId: deliveryUserId,
          type: 'earning',
          amount: deliveryNetAmount,
          relatedOrderId: estimation.orderId,
        }),
        this.commissionRepository.create({
          type: 'delivery',
          percentage: 5,
        }),
      ];
      if (platformUserId) {
        transactionOps.push(
          this.transactionRepository.create({
            userId: platformUserId,
            type: 'commission',
            amount: platformFeeAmount,
            relatedOrderId: estimation.orderId,
          }),
        );
      }
      await Promise.allSettled(transactionOps);

      const markPaid = await this.markEstimationPaid(dto.estimationId);
      if (markPaid instanceof ServiceError) {
        return markPaid;
      }

      return {
        success: true,
        message: 'Delivery payment completed successfully',
        data: {
          payment,
          walletBalance: Number(debited.walletBalance ?? 0),
          deliveryUserId,
          deliveryNetAmount,
          platformFeeAmount,
        },
        statusCode: 200,
      };
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new ServiceError('CONFIGURATION_ERROR', 'STRIPE_SECRET_KEY is missing for stripe delivery payments', 500, 'payment-service');
    }

    const stripe = new Stripe(stripeSecretKey);

    let intent: Stripe.PaymentIntent;
    try {
      const stripeCurrency = (this.configService.get<string>('STRIPE_CURRENCY', 'mad') || 'mad').toLowerCase();
      intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: stripeCurrency,
        customer: dto.stripeCustomerId,
        automatic_payment_methods: { enabled: true },
        description: dto.description ?? `Delivery payment for estimation ${dto.estimationId}`,
        metadata: {
          estimationId: dto.estimationId,
          orderId: estimation.orderId,
          clientId,
          deliveryUserId,
          platformFeePercentage: '5',
          flow: 'delivery_payment',
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
      orderId: estimation.orderId,
      estimationId: dto.estimationId,
      clientId,
      amount,
      paymentMethod: 'stripe_card',
      status: 'blocked',
      stripePaymentIntentId: intent.id,
      stripeCustomerId: dto.stripeCustomerId,
    });

    return {
      success: true,
      message: 'Stripe delivery payment intent created successfully',
      data: {
        payment,
        paymentIntentId: intent.id,
        paymentIntentClientSecret: intent.client_secret,
      },
      statusCode: 201,
    };
  }

  async confirmStripeDeliveryPayment(clientId: string, paymentIntentId: string) {
    if (!paymentIntentId) {
      return new ServiceError('VALIDATION_ERROR', 'paymentIntentId is required', 400, 'payment-service');
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new ServiceError('CONFIGURATION_ERROR', 'STRIPE_SECRET_KEY is missing', 500, 'payment-service');
    }

    const platformUserId = await this.getPlatformUserId();

    const payment = await this.paymentRepository.findByStripePaymentIntentId(paymentIntentId);
    if (!payment) {
      return new ServiceError('NOT_FOUND', `Payment intent ${paymentIntentId} not found`, 404, 'payment-service');
    }
    if (clientId && payment.clientId !== clientId) {
      return new ServiceError('FORBIDDEN', 'Cannot confirm another user delivery payment', 403, 'payment-service');
    }
    if (!payment.estimationId) {
      return new ServiceError('VALIDATION_ERROR', 'Payment is not linked to an estimation', 400, 'payment-service');
    }
    if (payment.status === 'released') {
      return {
        success: true,
        message: 'Delivery payment already confirmed',
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

    const estimation = await this.getEstimation(payment.estimationId);
    if (estimation instanceof ServiceError) return estimation;

    const deliveryUserId = estimation.acceptedBy ?? estimation.createdBy;
    if (!deliveryUserId) {
      return new ServiceError('VALIDATION_ERROR', 'Estimation has no delivery user', 400, 'payment-service');
    }

    const deliveryNetAmount = Number((payment.amount * 0.95).toFixed(2));
    const platformFeeAmount = Number((payment.amount - deliveryNetAmount).toFixed(2));

    const creditedDelivery = await this.topUpWalletBalance(deliveryUserId, deliveryNetAmount);
    if (creditedDelivery instanceof ServiceError) return creditedDelivery;

    if (platformUserId) {
      const creditedPlatform = await this.topUpWalletBalance(platformUserId, platformFeeAmount);
      if (creditedPlatform instanceof ServiceError) {
        await this.debitWalletBalance(deliveryUserId, deliveryNetAmount);
        return creditedPlatform;
      }
    }

    const updated = await this.paymentRepository.updateById(payment.id, {
      status: 'released',
      stripePaymentIntentId: paymentIntentId,
    });

    const transactionOps: Promise<any>[] = [
      this.transactionRepository.create({
        userId: deliveryUserId,
        type: 'earning',
        amount: deliveryNetAmount,
        relatedOrderId: payment.orderId ?? undefined,
      }),
      this.commissionRepository.create({
        type: 'delivery',
        percentage: 5,
      }),
    ];
    if (platformUserId) {
      transactionOps.push(
        this.transactionRepository.create({
          userId: platformUserId,
          type: 'commission',
          amount: platformFeeAmount,
          relatedOrderId: payment.orderId ?? undefined,
        }),
      );
    }
    await Promise.allSettled(transactionOps);

    const markPaid = await this.markEstimationPaid(payment.estimationId);
    if (markPaid instanceof ServiceError) return markPaid;

    return {
      success: true,
      message: 'Stripe delivery payment confirmed successfully',
      data: {
        payment: updated ?? payment,
        deliveryUserId,
        deliveryNetAmount,
        platformFeeAmount,
      },
      statusCode: 200,
    };
  }

  private async getEstimation(estimationId: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.ordersClient.send(ORDERS_PATTERNS.ESTIMATION_FIND_ONE, {
          params: { id: estimationId },
        }),
      );
      if (response?.success === false || !response?.data) {
        return new ServiceError('NOT_FOUND', 'Estimation not found', 404, 'payment-service');
      }
      return response.data;
    } catch {
      return new ServiceError('NOT_FOUND', 'Estimation not found', 404, 'payment-service');
    }
  }

  private async getOrder(orderId: string, requesterId: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.ordersClient.send('orders/find-one', {
          params: { id: orderId },
          user: { sub: requesterId, role: 'client' },
        }),
      );
      const order = response?.data ?? response;
      if (!order) {
        return new ServiceError('NOT_FOUND', 'Order not found', 404, 'payment-service');
      }
      return order;
    } catch {
      return new ServiceError('NOT_FOUND', 'Order not found', 404, 'payment-service');
    }
  }

  private async markEstimationPaid(estimationId: string): Promise<ServiceError | void> {
    try {
      const response = await lastValueFrom(
        this.ordersClient.send(ORDERS_PATTERNS.ESTIMATION_MARK_PAID, {
          params: { id: estimationId },
        }),
      );
      if (response?.success === false) {
        return new ServiceError(
          'INTERNAL_SERVER_ERROR',
          response?.message ?? 'Failed to mark estimation paid',
          500,
          'payment-service',
        );
      }
    } catch (error: any) {
      return new ServiceError(
        'INTERNAL_SERVER_ERROR',
        error?.message ?? 'Failed to mark estimation paid',
        500,
        'payment-service',
      );
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
