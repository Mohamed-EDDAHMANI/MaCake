import { Injectable, Inject } from '@nestjs/common';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';

@Injectable()
export class FindByOrderUseCase {
  constructor(
    @Inject(ESTIMATION_REPOSITORY) private readonly estimationRepository: IEstimationRepository,
  ) {}

  async execute(orderId: string) {
    if (!orderId) {
      return { success: true, data: [] };
    }

    const estimations = await this.estimationRepository.findByOrderId(orderId);

    return {
      success: true,
      data: estimations.map((e) => ({
        id: e.id,
        orderId: e.orderId,
        details: e.details,
        price: e.price,
        userRole: e.userRole,
        status: e.status,
        createdBy: e.createdBy ?? null,
        acceptedBy: e.acceptedBy ?? null,
        paidAt: e.paidAt ?? null,
        createdAt: e.createdAt,
      })),
    };
  }
}
