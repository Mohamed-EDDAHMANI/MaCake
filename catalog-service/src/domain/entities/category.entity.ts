export interface CategoryProps {
  id: string;
  name: string;
  description: string;
  createdAt?: Date;
}

export class Category {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt?: Date;

  private constructor(props: CategoryProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.createdAt = props.createdAt;
  }

  static create(props: CategoryProps): Category {
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Category name cannot be empty.');
    }
    return new Category(props);
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props);
  }

  // ── Business behaviour ──────────────────────────────────────────────────

  rename(newName: string): Category {
    if (!newName || newName.trim().length === 0) {
      throw new Error('Category name cannot be empty.');
    }
    return Category.reconstitute({ ...this, name: newName.trim() });
  }

  isSameName(other: Category): boolean {
    return this.name.toLowerCase() === other.name.toLowerCase();
  }
}
