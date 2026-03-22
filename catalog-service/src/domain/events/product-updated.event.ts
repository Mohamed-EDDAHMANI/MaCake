export class ProductUpdatedEvent {
  readonly occurredAt: Date = new Date();

  constructor(
    readonly productId: string,
    readonly updatedFields: string[],
  ) {}
}
