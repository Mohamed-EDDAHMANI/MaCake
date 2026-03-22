export interface LikeProps {
  id: string;
  userId: string;
  productId: string;
  createdAt?: Date;
}

export class Like {
  private constructor(private readonly props: LikeProps) {}

  static reconstitute(data: LikeProps): Like {
    return new Like(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get productId(): string {
    return this.props.productId;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }
}
