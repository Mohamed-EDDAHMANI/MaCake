import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

@WebSocketGateway({
  cors: { origin: '*', methods: ['GET', 'POST'] },
  namespace: '/payments',
})
export class PaymentEventsGateway {
  @WebSocketServer()
  server: any;

  /** Emitted after a payment is confirmed (wallet or Stripe). */
  emitPaymentConfirmed(payload: { orderId: string; clientId: string; amount: number }) {
    this.server?.emit('payment.confirmed', payload);
  }

  /** Emitted whenever a user's wallet balance changes (debit or top-up). */
  emitWalletChanged(payload: { userId: string; walletBalance: number }) {
    this.server?.emit('wallet.changed', payload);
  }

  /** Emitted when a like is toggled on a product. */
  emitLikeToggled(payload: { productId: string; liked: boolean; count: number }) {
    this.server?.emit('like.toggled', payload);
  }

  /** Emitted when a delivery payment is released (estimation marked as paid). */
  emitEstimationPaid(payload: { estimationId: string; clientId: string; deliveryUserId: string; amount: number }) {
    this.server?.emit('estimation.paid', payload);
  }
}
