import { Transaction, TransactionType } from '../entities/transaction.entity';

export const TRANSACTION_REPOSITORY = Symbol('TRANSACTION_REPOSITORY');

export interface ITransactionRepository {
  create(data: {
    userId?: string;
    type: TransactionType;
    amount: number;
    relatedOrderId?: string;
    stripeChargeId?: string;
    stripeAccountId?: string;
  }): Promise<Transaction>;
}
