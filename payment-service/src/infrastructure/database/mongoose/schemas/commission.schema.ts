import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommissionDocument = HydratedDocument<CommissionSchema>;

@Schema({ timestamps: false })
export class CommissionSchema {
  @Prop({ required: true, enum: ['order', 'delivery'] })
  type: 'order' | 'delivery';

  @Prop({ required: true, min: 0, max: 100 })
  percentage: number;
}

export const CommissionSchemaFactory = SchemaFactory.createForClass(CommissionSchema);
