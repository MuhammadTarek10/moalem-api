import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { CommonSchema } from '../../core/database/common.schema';

@Schema({ timestamps: true })
export class Coupon extends CommonSchema {
  @Prop({ type: String, required: true, unique: true })
  code: string;

  @Prop({ type: Types.ObjectId, required: true })
  issuedBy: Types.ObjectId;

  @Prop({ type: Number, required: true })
  duration: number; // in days

  @Prop({ type: Boolean, required: false, default: false })
  isRedeemed: boolean;

  @Prop({ type: Types.ObjectId, required: false })
  redeemedBy: Types.ObjectId;

  @Prop({ type: Boolean, required: true, default: false })
  isFirstCode: boolean;

  @Prop({ type: Types.ObjectId, required: false })
  firstCouponId: Types.ObjectId;

  @Prop({ type: Date, required: false })
  redeemedAt: Date;

  @Prop({ type: Date, required: false })
  expiresAt?: Date;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
