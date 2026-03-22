import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProfileLikeDocument = HydratedDocument<ProfileLike>;

@Schema({ timestamps: true })
export class ProfileLike {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  patissiereId: string;

  createdAt?: Date;
}

export const ProfileLikeSchema = SchemaFactory.createForClass(ProfileLike);

// One like per user per patissiere profile
ProfileLikeSchema.index({ userId: 1, patissiereId: 1 }, { unique: true });
ProfileLikeSchema.index({ patissiereId: 1 });
