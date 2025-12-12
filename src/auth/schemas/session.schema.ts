import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonSchema } from 'src/core/database/common.schema';

@Schema({
  collection: 'sessions',
  timestamps: true,
})
export class Session extends CommonSchema {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  refreshTokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ required: false })
  revokedAt: Date;

  @Prop({ required: false })
  ip?: string;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
