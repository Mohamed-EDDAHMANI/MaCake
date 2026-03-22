export interface OrderItemProps {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  customizationDetails?: any;
}

export class OrderItem {
  private props: OrderItemProps;

  private constructor(props: OrderItemProps) {
    this.props = props;
  }

  static reconstitute(data: OrderItemProps): OrderItem {
    return new OrderItem(data);
  }

  get id(): string {
    return this.props.id;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get productId(): string {
    return this.props.productId;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get price(): number {
    return this.props.price;
  }

  get customizationDetails(): any {
    return this.props.customizationDetails;
  }
}
