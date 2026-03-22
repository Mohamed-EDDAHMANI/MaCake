import { ServiceError } from '../../common/exceptions';

export class Money {
  private constructor(readonly value: number) {}

  static create(amount: number): Money | ServiceError {
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount < 0) {
      return new ServiceError(
        'VALIDATION_ERROR',
        'Price must be a non-negative number',
        400,
        'order-service',
      );
    }
    return new Money(amount);
  }
}
