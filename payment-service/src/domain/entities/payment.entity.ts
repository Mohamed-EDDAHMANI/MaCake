export type PaymentMethod = 'stripe_card' | 'wallet';
export type PaymentStatus = 'blocked' | 'released' | 'refunded';

export class Payment {
  constructor(
    public readonly id: string,
    public readonly orderId: string | null,
    public readonly estimationId: string | null,
    public readonly clientId: string,
    public readonly amount: number,
    public readonly paymentMethod: PaymentMethod,
    public status: PaymentStatus,
    public readonly stripePaymentIntentId?: string,
    public readonly stripeCheckoutSessionId?: string,
    public readonly stripeCustomerId?: string,
    public readonly createdAt?: Date,
  ) {}

  static reconstitute(data: {
    id: string;
    orderId: string | null;
    estimationId: string | null;
    clientId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    stripeCustomerId?: string;
    createdAt?: Date;
  }): Payment {
    return new Payment(
      data.id,
      data.orderId,
      data.estimationId,
      data.clientId,
      data.amount,
      data.paymentMethod,
      data.status,
      data.stripePaymentIntentId,
      data.stripeCheckoutSessionId,
      data.stripeCustomerId,
      data.createdAt,
    );
  }

  // Behavior
  isReleased(): boolean { return this.status === 'released'; }
  isRefunded(): boolean { return this.status === 'refunded'; }
  isBlocked(): boolean { return this.status === 'blocked'; }
  isOwnedBy(clientId: string): boolean { return this.clientId === clientId; }
  canBeConfirmed(): boolean { return this.status === 'blocked'; }
  release(): void { this.status = 'released'; }
  refund(): void { this.status = 'refunded'; }
}
