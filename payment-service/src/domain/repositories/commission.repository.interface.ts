import { Commission, CommissionType } from '../entities/commission.entity';

export const COMMISSION_REPOSITORY = Symbol('COMMISSION_REPOSITORY');

export interface ICommissionRepository {
  create(data: { type: CommissionType; percentage: number }): Promise<Commission>;
}
