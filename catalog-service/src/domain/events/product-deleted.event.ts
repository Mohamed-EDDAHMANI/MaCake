export class ProductDeletedEvent {
  readonly occurredAt: Date = new Date();

  constructor(
    readonly productId: string,
    readonly soft: boolean,
  ) {}
}
