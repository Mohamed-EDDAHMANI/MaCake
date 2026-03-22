import { Price, ProductTitle, ImageUrl } from '../value-objects';

export interface ProductProps {
  id: string;
  title: string;
  description: string;
  price: number;
  isActive: boolean;
  categoryId: string;
  category?: { id: string; name: string };
  createdAt?: Date;
  images?: string[];
  personalizationOptions?: Record<string, unknown>;
  ingredients?: string[];
  patissiereId?: string;
  rating?: number;
}

export class Product {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly price: number;
  readonly isActive: boolean;
  readonly categoryId: string;
  readonly category?: { id: string; name: string };
  readonly createdAt?: Date;
  readonly images: string[];
  readonly personalizationOptions: Record<string, unknown>;
  readonly ingredients: string[];
  readonly patissiereId?: string;
  readonly rating: number;

  private constructor(props: ProductProps) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.price = props.price;
    this.isActive = props.isActive;
    this.categoryId = props.categoryId;
    this.category = props.category;
    this.createdAt = props.createdAt;
    this.images = props.images ?? [];
    this.personalizationOptions = props.personalizationOptions ?? {};
    this.ingredients = props.ingredients ?? [];
    this.patissiereId = props.patissiereId;
    this.rating = props.rating ?? 0;
  }

  /** Create a new Product — validates invariants via Value Objects. */
  static create(props: ProductProps): Product {
    ProductTitle.create(props.title);  // throws if blank / too long
    Price.create(props.price);         // throws if negative / non-finite
    return new Product(props);
  }

  /** Reconstitute an existing Product from persistence — skips re-validation. */
  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  // ── Business behaviour ──────────────────────────────────────────────────

  deactivate(): Product {
    return Product.reconstitute({ ...this.toProps(), isActive: false });
  }

  activate(): Product {
    return Product.reconstitute({ ...this.toProps(), isActive: true });
  }

  updatePrice(newPrice: number): Product {
    Price.create(newPrice);
    return Product.reconstitute({ ...this.toProps(), price: newPrice });
  }

  addImage(url: string): Product {
    ImageUrl.create(url);
    return Product.reconstitute({ ...this.toProps(), images: [...this.images, url] });
  }

  isOwnedBy(patissiereId: string): boolean {
    return this.patissiereId === patissiereId;
  }

  hasImages(): boolean {
    return this.images.length > 0;
  }

  private toProps(): ProductProps {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      price: this.price,
      isActive: this.isActive,
      categoryId: this.categoryId,
      category: this.category,
      createdAt: this.createdAt,
      images: this.images,
      personalizationOptions: this.personalizationOptions,
      ingredients: this.ingredients,
      patissiereId: this.patissiereId,
      rating: this.rating,
    };
  }
}
