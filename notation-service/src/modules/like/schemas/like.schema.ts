import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LikeDocument = HydratedDocument<Like>;

@Schema({ timestamps: true })
export class Like {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  productId: string;

  createdAt?: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// One like per user per product
LikeSchema.index({ userId: 1, productId: 1 }, { unique: true });
LikeSchema.index({ productId: 1 });
