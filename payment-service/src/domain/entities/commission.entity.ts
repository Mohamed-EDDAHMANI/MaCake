export type CommissionType = 'order' | 'delivery';

export class Commission {
  constructor(
    public readonly id: string,
    public readonly type: CommissionType,
    public readonly percentage: number,
  ) {}

  static reconstitute(data: {
    id: string;
    type: CommissionType;
    percentage: number;
  }): Commission {
    return new Commission(data.id, data.type, data.percentage);
  }

  isOrderCommission(): boolean { return this.type === 'order'; }
  isDeliveryCommission(): boolean { return this.type === 'delivery'; }
}
