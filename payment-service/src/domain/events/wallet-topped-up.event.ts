export class WalletToppedUpEvent {
  constructor(
    readonly userId: string,
    readonly amount: number,
    readonly newBalance: number,
  ) {}
}
