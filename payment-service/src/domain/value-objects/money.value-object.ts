import { ServiceError } from '../../common/exceptions';

export class Money {
  private constructor(readonly value: number) {}

  static create(amount: number): Money | ServiceError {
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0)
      return new ServiceError('VALIDATION_ERROR', 'Amount must be a positive number', 400, 'payment-service');
    return new Money(amount);
  }

  static createNonNegative(amount: number): Money | ServiceError {
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount < 0)
      return new ServiceError('VALIDATION_ERROR', 'Amount must be a non-negative number', 400, 'payment-service');
    return new Money(amount);
  }

  add(other: Money): Money {
    return new Money(Number((this.value + other.value).toFixed(2)));
  }

  subtract(other: Money): Money {
    return new Money(Number((this.value - other.value).toFixed(2)));
  }

  percentage(pct: number): Money {
    return new Money(Number((this.value * pct / 100).toFixed(2)));
  }
}
