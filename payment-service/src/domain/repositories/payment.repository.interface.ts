import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface IPaymentRepository {
  create(data: {
    orderId?: string;
    estimationId?: string;
    clientId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    stripeCustomerId?: string;
  }): Promise<Payment>;

  findByStripeCheckoutSessionId(sessionId: string): Promise<Payment | null>;
  findByStripePaymentIntentId(paymentIntentId: string): Promise<Payment | null>;

  updateById(
    paymentId: string,
    data: {
      status?: PaymentStatus;
      stripePaymentIntentId?: string;
    },
  ): Promise<Payment | null>;
}
