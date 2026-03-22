import { Injectable, Inject } from '@nestjs/common';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';

@Injectable()
export class GetOrderInternalUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
  ) {}

  /**
   * Get order clientId and status by id (for estimation flow).
   */
  async executeForInternal(orderId: string): Promise<{ clientId: string; status: string } | null> {
    return this.orderRepository.findByIdForInternal(orderId);
  }

  /**
   * Get full order with items by id (for delivery available estimations).
   */
  async executeWithItems(orderId: string): Promise<any | null> {
    return this.orderRepository.findWithItemsById(orderId);
  }
}
