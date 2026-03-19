import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: Object, default: {} })
  personalizationOptions: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  ingredients: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patissiereId: Types.ObjectId;

  @Prop({ default: 0 })
  rating: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ default: 0 })
  likesCount: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
