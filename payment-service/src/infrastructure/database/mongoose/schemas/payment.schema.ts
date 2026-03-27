import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PaymentDocument = HydratedDocument<PaymentSchema>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PaymentSchema {
  @Prop({ type: Types.ObjectId, required: false, default: null })
  orderId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, required: false, default: null })
  estimationId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, required: true })
  clientId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, enum: ['stripe_card', 'wallet'] })
  paymentMethod: 'stripe_card' | 'wallet';

  @Prop({ type: String, default: null })
  stripePaymentIntentId: string | null;

  @Prop({ type: String, default: null })
  stripeCheckoutSessionId: string | null;

  @Prop({ type: String, default: null })
  stripeCustomerId: string | null;

  @Prop({ required: true, enum: ['blocked', 'released', 'refunded'], default: 'blocked' })
  status: 'blocked' | 'released' | 'refunded';

  createdAt?: Date;
}

export const PaymentSchemaFactory = SchemaFactory.createForClass(PaymentSchema);
