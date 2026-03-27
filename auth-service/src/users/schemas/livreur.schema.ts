import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LivreurDocument = HydratedDocument<Livreur>;

@Schema()
export class Livreur {
  @Prop({ default: 0 })
  walletBalance: number;
  
  @Prop({ type: String, default: null })
  vehicleType: string | null;

  @Prop({ type: Number, default: null })
  ratingAverage: number | null;

  @Prop({ default: 0 })
  deliveriesCompleted: number;

  @Prop({ default: 0 })
  earnings: number;
}

export const LivreurSchema = SchemaFactory.createForClass(Livreur);
