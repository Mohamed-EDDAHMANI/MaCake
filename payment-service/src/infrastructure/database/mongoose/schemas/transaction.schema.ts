import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<TransactionSchema>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class TransactionSchema {
  @Prop({ type: Types.ObjectId, default: null })
  userId?: Types.ObjectId | null;

  @Prop({ required: true, enum: ['earning', 'commission'] })
  type: 'earning' | 'commission';

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ type: Types.ObjectId, default: null })
  relatedOrderId: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  stripeChargeId: string | null;

  @Prop({ type: String, default: null })
  stripeAccountId: string | null;

  createdAt?: Date;
}

export const TransactionSchemaFactory = SchemaFactory.createForClass(TransactionSchema);
