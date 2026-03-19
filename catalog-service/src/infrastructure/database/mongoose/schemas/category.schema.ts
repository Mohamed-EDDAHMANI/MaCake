import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<CategorySchema>;

@Schema({ timestamps: true })
export class CategorySchema {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ default: '' })
  description: string;
}

export const CategorySchemaFactory = SchemaFactory.createForClass(CategorySchema);
