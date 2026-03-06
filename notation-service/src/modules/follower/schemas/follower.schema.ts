import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FollowerDocument = HydratedDocument<Follower>;

@Schema({ timestamps: true })
export class Follower {
  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  patissiereId: string;

  createdAt?: Date;
}

export const FollowerSchema = SchemaFactory.createForClass(Follower);

// One follow per client per patissiere
FollowerSchema.index({ clientId: 1, patissiereId: 1 }, { unique: true });
FollowerSchema.index({ patissiereId: 1 });
