export class Product {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string,
    public readonly price: number,
    public readonly isActive: boolean,
    public readonly categoryId: string,
    public readonly category?: { id: string; name: string },
    public readonly createdAt?: Date,
    public readonly images?: string[],
    public readonly personalizationOptions?: Record<string, unknown>,
    public readonly ingredients?: string[],
    public readonly patissiereId?: string,
    public readonly rating?: number,
  ) {}
}
