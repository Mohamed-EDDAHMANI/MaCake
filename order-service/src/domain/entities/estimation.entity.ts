import { ServiceError } from '../../common/exceptions';

export enum EstimationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
}

export enum EstimationUserRole {
  CLIENT = 'client',
  DELIVERY = 'delivery',
}

export interface EstimationProps {
  id: string;
  orderId: string;
  details: string;
  price: number;
  userRole?: EstimationUserRole;
  createdBy?: string | null;
  acceptedBy?: string | null;
  paidAt?: Date | null;
  status: EstimationStatus;
  createdAt?: Date;
}

export class Estimation {
  private props: EstimationProps;

  private constructor(props: EstimationProps) {
    this.props = props;
  }

  static create(data: Omit<EstimationProps, 'id' | 'status'>): Estimation | ServiceError {
    if (typeof data.price !== 'number' || data.price < 0) {
      return new ServiceError(
        'VALIDATION_ERROR',
        'Price must be a non-negative number',
        400,
        'order-service',
      );
    }
    return new Estimation({
      ...data,
      id: '',
      status: EstimationStatus.PENDING,
    });
  }

  static reconstitute(data: EstimationProps): Estimation {
    return new Estimation(data);
  }

  get id(): string {
    return this.props.id;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get details(): string {
    return this.props.details;
  }

  get price(): number {
    return this.props.price;
  }

  get userRole(): EstimationUserRole | undefined {
    return this.props.userRole;
  }

  get createdBy(): string | null | undefined {
    return this.props.createdBy;
  }

  get acceptedBy(): string | null | undefined {
    return this.props.acceptedBy;
  }

  get paidAt(): Date | null | undefined {
    return this.props.paidAt;
  }

  get status(): EstimationStatus {
    return this.props.status;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  confirm(): void {
    this.props.status = EstimationStatus.CONFIRMED;
  }

  markPaid(): void {
    this.props.paidAt = new Date();
  }

  setAcceptedBy(userId: string): void {
    this.props.acceptedBy = userId;
  }
}
