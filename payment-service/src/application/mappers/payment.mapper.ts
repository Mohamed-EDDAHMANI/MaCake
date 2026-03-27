import { Payment } from '../../domain/entities/payment.entity';

export class PaymentMapper {
  static toDto(payment: Payment) {
    return {
      id: payment.id,
      orderId: payment.orderId,
      estimationId: payment.estimationId,
      clientId: payment.clientId,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      stripeCheckoutSessionId: payment.stripeCheckoutSessionId,
      stripeCustomerId: payment.stripeCustomerId,
      createdAt: payment.createdAt,
    };
  }
}
