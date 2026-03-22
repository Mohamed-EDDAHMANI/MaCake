export class OrderStatusChangedEvent {
  constructor(
    readonly orderId: string,
    readonly previousStatus: string,
    readonly newStatus: string,
    readonly clientId: string,
    readonly patissiereId: string,
  ) {}
}
