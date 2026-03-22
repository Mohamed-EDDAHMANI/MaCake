import { Follower } from '../entities/follower.entity';

export const FOLLOWER_REPOSITORY = Symbol('FOLLOWER_REPOSITORY');

export interface IFollowerRepository {
  findOne(clientId: string, patissiereId: string): Promise<Follower | null>;
  create(data: { clientId: string; patissiereId: string }): Promise<Follower>;
  delete(clientId: string, patissiereId: string): Promise<boolean>;
  findByPatissiere(patissiereId: string): Promise<Follower[]>;
  countByPatissiere(patissiereId: string): Promise<number>;
}
