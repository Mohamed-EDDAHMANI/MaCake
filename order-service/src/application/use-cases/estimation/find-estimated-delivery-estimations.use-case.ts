import { Injectable, Inject } from '@nestjs/common';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { ORDER_REPOSITORY } from '../../../domain/repositories/order.repository.interface';
import type { IOrderRepository } from '../../../domain/repositories/order.repository.interface';

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
      if (!order) continue;
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

    return { success: true, data };
  }
}
