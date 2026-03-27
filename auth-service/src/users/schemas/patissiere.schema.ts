import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PatissiereDocument = HydratedDocument<Patissiere>;

@Schema()
export class Patissiere {
  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ type: String, default: null })
  stripeAccountId: string | null;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ type: Number, default: null })
  ratingAverage: number | null;

  @Prop({ default: 0 })
  completedOrdersCount: number;

  @Prop({ type: [Types.ObjectId], ref: 'Product', default: [] })
  products: Types.ObjectId[];

  @Prop({ default: 0 })
  earnings: number;
}

export const PatissiereSchema = SchemaFactory.createForClass(Patissiere);
