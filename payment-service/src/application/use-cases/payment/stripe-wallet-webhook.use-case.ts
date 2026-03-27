import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { ServiceError } from '../../../common/exceptions';
import { TopUpWalletUseCase } from './top-up-wallet.use-case';

@Injectable()
export class StripeWalletWebhookUseCase {
  constructor(
    private readonly configService: ConfigService,
    private readonly topUpWalletUseCase: TopUpWalletUseCase,
  ) {}

  async execute(payload: any) {
    const eventType = String(payload?.type ?? '');
    if (!eventType) {
      return new ServiceError('VALIDATION_ERROR', 'Webhook payload type is required', 400, 'payment-service');
    }

    // We handle only successful checkout completion for wallet topups.
    if (eventType !== 'checkout.session.completed') {
      return {
        success: true,
        message: `Webhook ignored for event ${eventType}`,
        data: null,
        statusCode: 200,
      };
    }

    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new ServiceError('CONFIGURATION_ERROR', 'STRIPE_SECRET_KEY is missing', 500, 'payment-service');
    }

    const session = payload?.data?.object as Stripe.Checkout.Session | undefined;
    const sessionId = session?.id;
    if (!sessionId) {
      return new ServiceError('VALIDATION_ERROR', 'checkout session id missing in webhook', 400, 'payment-service');
    }

    const stripe = new Stripe(stripeSecretKey);

    let verifiedSession: Stripe.Checkout.Session;
    try {
      verifiedSession = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
    } catch (error: any) {
      return new ServiceError(
        'PAYMENT_FAILED',
        `Failed to verify checkout session: ${error?.message ?? 'unknown error'}`,
        400,
        'payment-service',
      );
    }

    if (verifiedSession.payment_status !== 'paid') {
      return new ServiceError('PAYMENT_FAILED', 'Checkout session is not paid', 400, 'payment-service');
    }

    const intentId =
      typeof verifiedSession.payment_intent === 'string'
        ? verifiedSession.payment_intent
        : verifiedSession.payment_intent?.id;

    const released = await this.topUpWalletUseCase.releaseWalletTopUp(sessionId, intentId);
    if (released instanceof ServiceError) return released;

    return {
      success: true,
      message: 'Webhook processed successfully',
      data: released?.data ?? null,
      statusCode: 200,
    };
  }
}
