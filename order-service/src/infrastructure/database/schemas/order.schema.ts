import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REFUSED = 'refused',
  PREPARING = 'preparing',
  COMPLETED = 'completed',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Order {
  @Prop({ type: Types.ObjectId, auto: true })
  id: string;

  @Prop({ type: String, required: true })
  clientId: string;

  @Prop({ type: String, required: true })
  patissiereId: string;

  @Prop({ type: String, required: true })
  patissiereAddress: string;

  @Prop({ type: String, required: true })
  deliveryAddress: string;

  @Prop({ type: String, enum: ['profile', 'current_location'], required: true })
  deliveryAddressSource: 'profile' | 'current_location';

  @Prop({ type: Number, default: null })
  deliveryLatitude: number | null;

  @Prop({ type: Number, default: null })
  deliveryLongitude: number | null;

  @Prop({ type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({ type: Date, required: true })
  requestedDateTime: Date;

  @Prop({ type: Number, required: true })
  totalPrice: number;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

