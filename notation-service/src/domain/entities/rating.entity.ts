import { ServiceError } from '../../common/exceptions';
import { Stars } from '../value-objects';

export interface RatingProps {
  id: string;
  fromUserId: string;
  toUserId: string;
  orderId?: string | null;
  productId?: string | null;
  stars: number;
  comment?: string | null;
  createdAt?: Date;
}

export class Rating {
  private constructor(private readonly props: RatingProps) {}

  static create(data: Omit<RatingProps, 'id'>): Rating | ServiceError {
    if (!data.fromUserId || data.fromUserId.trim() === '') {
      return new ServiceError('VALIDATION_ERROR', 'fromUserId is required', 400, 'notation-service');
    }

    if (!data.toUserId || data.toUserId.trim() === '') {
      return new ServiceError('VALIDATION_ERROR', 'toUserId is required', 400, 'notation-service');
    }

    const starsResult = Stars.create(data.stars);
    if (starsResult instanceof ServiceError) {
      return starsResult;
    }

    return new Rating({
      id: '',
      ...data,
    });
  }

  static reconstitute(data: RatingProps): Rating {
    return new Rating(data);
  }

  get id(): string {
    return this.props.id;
  }

  get fromUserId(): string {
    return this.props.fromUserId;
  }

  get toUserId(): string {
    return this.props.toUserId;
  }

  get orderId(): string | null | undefined {
    return this.props.orderId;
  }

  get productId(): string | null | undefined {
    return this.props.productId;
  }

  get stars(): number {
    return this.props.stars;
  }

  get comment(): string | null | undefined {
    return this.props.comment;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  isForProduct(): boolean {
    return !!this.props.productId;
  }

  isForUser(): boolean {
    return !!this.props.toUserId && !this.props.productId;
  }

  isFromUser(userId: string): boolean {
    return this.props.fromUserId === userId;
  }
}
