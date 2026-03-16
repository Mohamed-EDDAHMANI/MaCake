import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RatingDocument = HydratedDocument<Rating>;

@Schema({ timestamps: true })
export class Rating {
  @Prop({ required: true })
  fromUserId: string;

  @Prop({ required: true })
  toUserId: string;

  @Prop({ type: String, default: null })
  orderId: string | null;

  @Prop({ type: String, default: null })
  productId: string | null;

  @Prop({ required: true, min: 1, max: 5 })
  stars: number;

  @Prop({ type: String, default: null })
  comment: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

// One rating per user per (toUserId, orderId) for delivery/patissiere ratings
RatingSchema.index({ fromUserId: 1, toUserId: 1, orderId: 1 }, { unique: true, sparse: true });

// One rating per user per product (only when productId is set; allow multiple ratings with productId=null for delivery/patissiere)
RatingSchema.index(
  { fromUserId: 1, productId: 1 },
  { unique: true, partialFilterExpression: { productId: { $ne: null, $exists: true } } },
);

RatingSchema.index({ toUserId: 1 });
RatingSchema.index({ productId: 1 });
