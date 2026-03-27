import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

@Schema()
export class Client {
  @Prop({ default: 0 })
  walletBalance: number;

  @Prop({ type: [String], default: [] })
  orderIds: string[];

  @Prop({ type: Number, default: null })
  ratingAverage: number | null;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
