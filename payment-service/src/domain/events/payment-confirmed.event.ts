export class PaymentConfirmedEvent {
  constructor(
    readonly paymentId: string,
    readonly orderId: string | null,
    readonly clientId: string,
    readonly amount: number,
  ) {}
}
