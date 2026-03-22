export class ProductCreatedEvent {
  readonly occurredAt: Date = new Date();

  constructor(
    readonly productId: string,
    readonly patissiereId: string,
    readonly title: string,
    readonly price: number,
    readonly categoryId: string,
  ) {}
}
