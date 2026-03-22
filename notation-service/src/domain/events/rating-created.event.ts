export class RatingCreatedEvent {
  constructor(
    readonly ratingId: string,
    readonly fromUserId: string,
    readonly toUserId: string,
    readonly stars: number,
    readonly orderId?: string | null,
    readonly productId?: string | null,
  ) {}
}
