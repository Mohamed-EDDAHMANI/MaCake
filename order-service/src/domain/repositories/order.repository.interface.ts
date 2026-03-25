import { Order } from '../entities/order.entity';
import { OrderStatus } from '../value-objects/order-status.value-object';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface IOrderRepository {
  create(data: {
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
    items?: any[];
  }): Promise<Order>;

  findById(id: string): Promise<Order | null>;
  findByClientId(clientId: string): Promise<Order[]>;
  findByPatissiereId(patissiereId: string): Promise<Order[]>;
  findMany(filter: { clientId?: string; patissiereId?: string; status?: OrderStatus; userId?: string; role?: string }): Promise<Order[]>;
  update(id: string, data: Partial<{ status: OrderStatus; deletedByPatissiere: boolean; deletedByClient: boolean }>): Promise<Order | null>;
  delete(id: string): Promise<boolean>;

  /**
   * Internal: get order by id selecting only clientId and status (for estimation flow).
   */
  findByIdForInternal(id: string): Promise<{ clientId: string; status: OrderStatus } | null>;

  /**
   * Internal: get full order doc with items list (for delivery estimations view).
   */
  findWithItemsById(id: string): Promise<any | null>;
}
