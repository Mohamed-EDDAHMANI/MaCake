import { Like } from '../entities/like.entity';

export const LIKE_REPOSITORY = Symbol('LIKE_REPOSITORY');

export interface ILikeRepository {
  findOne(userId: string, productId: string): Promise<Like | null>;
  create(data: { userId: string; productId: string }): Promise<Like>;
  delete(userId: string, productId: string): Promise<boolean>;
  countByProduct(productId: string): Promise<number>;
  countByProducts(productIds: string[]): Promise<Record<string, number>>;
  findLikerIdsByProducts(productIds: string[]): Promise<Record<string, string[]>>;
  findByUser(userId: string): Promise<Like[]>;
}
