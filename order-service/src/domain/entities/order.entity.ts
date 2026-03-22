import { ServiceError } from '../../common/exceptions';
import { Money } from '../value-objects/money.value-object';
import { OrderStatus } from '../value-objects/order-status.value-object';

export interface OrderProps {
  id: string;
  clientId: string;
  patissiereId: string;
  deliveryAddress: string;
  patissiereAddress: string;
  deliveryAddressSource?: 'profile' | 'current_location';
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  patissiereLatitude?: number | null;
  patissiereLongitude?: number | null;
  requestedDateTime?: Date;
  totalPrice: number;
  status: OrderStatus;
  items?: any[];
  createdAt?: Date;
}

export class Order {
  private props: OrderProps;

  private constructor(props: OrderProps) {
    this.props = props;
  }

  static create(data: Omit<OrderProps, 'id' | 'status'>): Order | ServiceError {
    if (!data.clientId || data.clientId.trim() === '') {
      return new ServiceError('VALIDATION_ERROR', 'clientId is required', 400, 'order-service');
    }
    if (!data.patissiereId || data.patissiereId.trim() === '') {
      return new ServiceError('VALIDATION_ERROR', 'patissiereId is required', 400, 'order-service');
    }

    const moneyResult = Money.create(data.totalPrice);
    if (moneyResult instanceof ServiceError) {
      return moneyResult;
    }

    return new Order({
      ...data,
      id: '',
      status: OrderStatus.PENDING,
    });
  }

  static reconstitute(data: OrderProps): Order {
    return new Order(data);
  }

  get id(): string {
    return this.props.id;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get patissiereId(): string {
    return this.props.patissiereId;
  }

  get deliveryAddress(): string {
    return this.props.deliveryAddress;
  }

  get patissiereAddress(): string {
    return this.props.patissiereAddress;
  }

  get deliveryAddressSource(): 'profile' | 'current_location' | undefined {
    return this.props.deliveryAddressSource;
  }

  get deliveryLatitude(): number | null | undefined {
    return this.props.deliveryLatitude;
  }

  get deliveryLongitude(): number | null | undefined {
    return this.props.deliveryLongitude;
  }

  get patissiereLatitude(): number | null | undefined {
    return this.props.patissiereLatitude;
  }

  get patissiereLongitude(): number | null | undefined {
    return this.props.patissiereLongitude;
  }

  get requestedDateTime(): Date | undefined {
    return this.props.requestedDateTime;
  }

  get totalPrice(): number {
    return this.props.totalPrice;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get items(): any[] | undefined {
    return this.props.items;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  accept(): void {
    if (this.props.status !== OrderStatus.PENDING) {
      throw new ServiceError(
        'INVALID_STATE',
        `Order cannot be accepted from status ${this.props.status}`,
        400,
        'order-service',
      );
    }
    this.props.status = OrderStatus.ACCEPTED;
  }

  refuse(): void {
    if (this.props.status !== OrderStatus.PENDING) {
      throw new ServiceError(
        'INVALID_STATE',
        `Order cannot be refused from status ${this.props.status}`,
        400,
        'order-service',
      );
    }
    this.props.status = OrderStatus.REFUSED;
  }

  markPaymentCompleted(): void {
    this.props.status = OrderStatus.PREPARING;
  }

  complete(): void {
    this.props.status = OrderStatus.COMPLETED;
  }

  startDelivery(): void {
    this.props.status = OrderStatus.DELIVERING;
  }

  markDelivered(): void {
    this.props.status = OrderStatus.DELIVERED;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.clientId === userId || this.props.patissiereId === userId;
  }

  canBeModifiedBy(userId: string, role: string): boolean {
    const normalizedRole = (role || '').toLowerCase();
    if (normalizedRole === 'delivery' || normalizedRole === 'livreur') return true;
    return this.isOwnedBy(userId);
  }
}
