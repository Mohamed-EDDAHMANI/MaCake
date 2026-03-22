import { Order } from '../../domain/entities/order.entity';

export class OrderMapper {
  static toDto(order: Order) {
    return {
      id: order.id,
      clientId: order.clientId,
      patissiereId: order.patissiereId,
      deliveryAddress: order.deliveryAddress,
      patissiereAddress: order.patissiereAddress,
      deliveryAddressSource: order.deliveryAddressSource,
      deliveryLatitude: order.deliveryLatitude ?? null,
      deliveryLongitude: order.deliveryLongitude ?? null,
      patissiereLatitude: order.patissiereLatitude ?? null,
      patissiereLongitude: order.patissiereLongitude ?? null,
      totalPrice: order.totalPrice,
      status: order.status,
      requestedDateTime: order.requestedDateTime,
      createdAt: order.createdAt,
    };
  }

  static toDtoList(orders: Order[]) {
    return orders.map((o) => this.toDto(o));
  }
}
