import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class CommonSchema {
  _id: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}
