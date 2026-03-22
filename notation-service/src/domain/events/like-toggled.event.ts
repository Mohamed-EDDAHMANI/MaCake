export class LikeToggledEvent {
  constructor(
    readonly userId: string,
    readonly productId: string,
    readonly liked: boolean,
  ) {}
}
