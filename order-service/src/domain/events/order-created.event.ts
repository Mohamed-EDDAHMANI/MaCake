export class OrderCreatedEvent {
  constructor(
    readonly orderId: string,
    readonly clientId: string,
    readonly patissiereId: string,
    readonly totalPrice: number,
  ) {}
}
