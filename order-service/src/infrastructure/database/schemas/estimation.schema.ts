import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EstimationDocument = HydratedDocument<Estimation>;

export enum EstimationUserRole {
  CLIENT = 'client',
  DELIVERY = 'delivery',
}

export enum EstimationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Estimation {
  @Prop({ type: Types.ObjectId, required: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  details: string;

  @Prop({ type: Number, required: true })
  price: number;

  @Prop({ type: String, enum: Object.values(EstimationUserRole), required: true })
  userRole: EstimationUserRole;

  @Prop({ type: String, enum: Object.values(EstimationStatus), default: EstimationStatus.PENDING })
  status: EstimationStatus;

  /** User id of the delivery who created this estimation (for delivery estimations). */
  @Prop({ type: String, default: null })
  createdBy: string | null;

  /** User id of the delivery who confirmed/accepted this estimation (for client estimations). */
  @Prop({ type: String, default: null })
  acceptedBy: string | null;

  /** When the client paid the delivery fee for this estimation. */
  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const EstimationSchema = SchemaFactory.createForClass(Estimation);
