export class ProductTitle {
  private constructor(readonly value: string) {}

  static create(title: string): ProductTitle {
    if (!title || title.trim().length === 0) {
      throw new Error('Product title cannot be empty.');
    }
    if (title.trim().length > 200) {
      throw new Error('Product title cannot exceed 200 characters.');
    }
    return new ProductTitle(title.trim());
  }

  equals(other: ProductTitle): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
