import { Estimation } from '../../domain/entities/estimation.entity';

export class EstimationMapper {
  static toDto(e: Estimation) {
    return {
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
    };
  }

  static toDtoList(list: Estimation[]) {
    return list.map((e) => this.toDto(e));
  }
}
