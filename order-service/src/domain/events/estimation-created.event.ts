export class EstimationCreatedEvent {
  constructor(
    readonly estimationId: string,
    readonly orderId: string,
    readonly price: number,
  ) {}
}
