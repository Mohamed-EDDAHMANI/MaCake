export type PaymentMethodType = 'stripe_card' | 'wallet';

export class PaymentMethod {
  private constructor(readonly value: PaymentMethodType) {}

  static stripeCard(): PaymentMethod { return new PaymentMethod('stripe_card'); }
  static wallet(): PaymentMethod { return new PaymentMethod('wallet'); }

  isStripeCard(): boolean { return this.value === 'stripe_card'; }
  isWallet(): boolean { return this.value === 'wallet'; }
}
