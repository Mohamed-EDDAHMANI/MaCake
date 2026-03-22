import { Injectable, Inject } from '@nestjs/common';
import { ESTIMATION_REPOSITORY } from '../../../domain/repositories/estimation.repository.interface';
import type { IEstimationRepository } from '../../../domain/repositories/estimation.repository.interface';
import { Types } from 'mongoose';

@Injectable()
export class FindEstimationByIdUseCase {
  constructor(
    @Inject(ESTIMATION_REPOSITORY) private readonly estimationRepository: IEstimationRepository,
  ) {}

  async execute(estimationId: string) {
    if (!estimationId || !Types.ObjectId.isValid(estimationId)) {
      return { success: false, message: 'Invalid estimation id', statusCode: 400, data: null };
    }

    const doc = await this.estimationRepository.findRawById(estimationId);
    if (!doc) {
      return { success: false, message: 'Estimation not found', statusCode: 404, data: null };
    }

    const d = doc as any;
    return {
      success: true,
      data: {
        id: String(d._id),
        orderId: String(d.orderId),
        price: d.price,
        acceptedBy: d.acceptedBy ?? null,
        createdBy: d.createdBy ?? null,
        status: d.status,
      },
    };
  }
}
