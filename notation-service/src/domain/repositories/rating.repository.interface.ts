import { Rating } from '../entities/rating.entity';

export const RATING_REPOSITORY = Symbol('RATING_REPOSITORY');

export interface IRatingRepository {
  create(data: {
    fromUserId: string;
    toUserId: string;
    orderId?: string | null;
    productId?: string | null;
    stars: number;
    comment?: string;
  }): Promise<Rating>;
  findByUser(userId: string): Promise<Rating[]>;
  findByProduct(productId: string): Promise<Rating[]>;
  findOne(filter: {
    fromUserId?: string;
    toUserId?: string;
    orderId?: string;
    productId?: string;
  }): Promise<Rating | null>;
  getAverageForUser(userId: string): Promise<{ average: number; count: number }>;
  getAverageForUsers(userIds: string[]): Promise<Record<string, { average: number; count: number }>>;
  existsByOrder(fromUserId: string, orderId: string): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}
