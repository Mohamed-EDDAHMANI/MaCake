export class Price {
  private constructor(readonly value: number) {}

  static create(amount: number): Price {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error(`Invalid price: ${amount}. Must be a non-negative finite number.`);
    }
    return new Price(amount);
  }

  equals(other: Price): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return `${this.value} MAD`;
  }
}
