import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoDbModule } from '../../database/mongodb.module';
import { PAYMENT_REPOSITORY } from '../../domain/repositories/payment.repository.interface';
import { TRANSACTION_REPOSITORY } from '../../domain/repositories/transaction.repository.interface';
import { COMMISSION_REPOSITORY } from '../../domain/repositories/commission.repository.interface';
import { PaymentSchemaFactory } from './mongoose/schemas/payment.schema';
import { TransactionSchemaFactory } from './mongoose/schemas/transaction.schema';
import { CommissionSchemaFactory } from './mongoose/schemas/commission.schema';
import { PaymentRepository } from './repositories/payment.repository';
import { TransactionRepository } from './repositories/transaction.repository';
import { CommissionRepository } from './repositories/commission.repository';

@Module({
  imports: [
    MongoDbModule,
    MongooseModule.forFeature([
      { name: 'Payment', schema: PaymentSchemaFactory },
      { name: 'Transaction', schema: TransactionSchemaFactory },
      { name: 'Commission', schema: CommissionSchemaFactory },
    ]),
  ],
  providers: [
    PaymentRepository,
    TransactionRepository,
    CommissionRepository,
    { provide: PAYMENT_REPOSITORY, useExisting: PaymentRepository },
    { provide: TRANSACTION_REPOSITORY, useExisting: TransactionRepository },
    { provide: COMMISSION_REPOSITORY, useExisting: CommissionRepository },
  ],
  exports: [
    PAYMENT_REPOSITORY,
    TRANSACTION_REPOSITORY,
    COMMISSION_REPOSITORY,
  ],
})
export class PaymentDatabaseModule {}
