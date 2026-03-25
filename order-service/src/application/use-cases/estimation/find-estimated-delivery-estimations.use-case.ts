import { Injectable, Inject } from '@nestjs/common';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';
import { OrderStatus } from '../../../domain/value-objects/order-status.value-object';

/** Order statuses that mean the delivery cycle is over or irrelevant. */
const TERMINAL_ORDER_STATUSES = new Set<string>([
  // OrderStatus.DELIVERING,
  OrderStatus.DELIVERED,
  OrderStatus.REFUSED,
]);

@Injectable()
export class FindEstimatedDeliveryEstimationsUseCase {
  constructor(
    @Inject(ESTIMATION_REPOSITORY) private readonly estimationRepository: IEstimationRepository,
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: IOrderRepository,
  ) {}

  async execute(userId: string) {
    const list = await this.estimationRepository.findEstimatedByDelivery(userId);

    const data: Array<{ estimation: any; order: any }> = [];
    for (const doc of list) {
      const orderId = String(doc.orderId);
      const order = await this.orderRepository.findWithItemsById(orderId);
      if (!order || TERMINAL_ORDER_STATUSES.has(order.status)) continue;
      data.push({
        estimation: {
          id: String(doc._id),
          orderId,
          details: doc.details,
          price: doc.price,
          userRole: doc.userRole,
          status: doc.status,
          createdBy: doc.createdBy ?? null,
          acceptedBy: doc.acceptedBy ?? null,
          paidAt: doc.paidAt ?? null,
          createdAt: doc.createdAt,
        },
        order,
      });
    }
    console.log("data", data);

    return { success: true, data };
  }
}
