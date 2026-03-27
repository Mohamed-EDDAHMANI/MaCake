export type TransactionType = 'earning' | 'commission';

export class Transaction {
  constructor(
    public readonly id: string,
    public readonly type: TransactionType,
    public readonly amount: number,
    public readonly userId?: string,
    public readonly relatedOrderId?: string,
    public readonly stripeChargeId?: string,
    public readonly stripeAccountId?: string,
    public readonly createdAt?: Date,
  ) {}

  static reconstitute(data: {
    id: string;
    type: TransactionType;
    amount: number;
    userId?: string;
    relatedOrderId?: string;
    stripeChargeId?: string;
    stripeAccountId?: string;
    createdAt?: Date;
  }): Transaction {
    return new Transaction(
      data.id,
      data.type,
      data.amount,
      data.userId,
      data.relatedOrderId,
      data.stripeChargeId,
      data.stripeAccountId,
      data.createdAt,
    );
  }

  isEarning(): boolean { return this.type === 'earning'; }
  isCommission(): boolean { return this.type === 'commission'; }
}
