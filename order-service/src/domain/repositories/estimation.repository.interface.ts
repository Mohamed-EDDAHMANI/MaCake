import { Estimation } from '../entities/estimation.entity';

export const ESTIMATION_REPOSITORY = Symbol('ESTIMATION_REPOSITORY');

export interface IEstimationRepository {
  create(data: {
    orderId: string;
    details: string;
    price: number;
    userRole?: string;
    createdBy?: string | null;
  }): Promise<Estimation>;

  findById(id: string): Promise<Estimation | null>;
  findByOrderId(orderId: string): Promise<Estimation[]>;
  findPendingForDelivery(excludeUserId?: string): Promise<any[]>;
  findAcceptedByDelivery(deliveryId: string): Promise<any[]>;
  findEstimatedByDelivery(deliveryId: string): Promise<any[]>;
  findDeliveredByDelivery(deliveryId: string): Promise<any[]>;
  update(id: string, data: Partial<{ status: string; acceptedBy: string | null; paidAt: Date }>): Promise<Estimation | null>;

  /**
   * Raw doc methods for complex operations (accept delivery offer etc.).
   */
  findRawById(id: string): Promise<any | null>;
  findRawByOrderIdAndRole(orderId: string, userRole: string): Promise<any | null>;
  saveRaw(doc: any): Promise<void>;
}
