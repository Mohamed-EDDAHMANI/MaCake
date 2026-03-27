export type PaymentStatusType = 'blocked' | 'released' | 'refunded';

export class PaymentStatus {
  private constructor(readonly value: PaymentStatusType) {}

  static blocked(): PaymentStatus { return new PaymentStatus('blocked'); }
  static released(): PaymentStatus { return new PaymentStatus('released'); }
  static refunded(): PaymentStatus { return new PaymentStatus('refunded'); }

  isReleased(): boolean { return this.value === 'released'; }
  isRefunded(): boolean { return this.value === 'refunded'; }
  isBlocked(): boolean { return this.value === 'blocked'; }
}
