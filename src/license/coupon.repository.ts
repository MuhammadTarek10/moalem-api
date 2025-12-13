import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { BaseRepository } from '../core/database/base.repository';
import { Coupon } from './schemas/coupon.schema';

export class CouponRepository extends BaseRepository<Coupon> {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<Coupon>,
  ) {
    super(couponModel);
  }

  async findByCode(code: string, session?: ClientSession) {
    return session
      ? await this.findOne({ code }, undefined, session)
      : this.findOne({ code });
  }

  async findValidCoupons(session?: ClientSession) {
    return session
      ? await this.find(
          {
            expiresAt: { $gt: new Date() },
            isRedeemed: false,
          },
          undefined,
          session,
        )
      : await this.find({
          expiresAt: { $gt: new Date() },
          isRedeemed: false,
        });
  }

  async redeemCoupon(code: string, userId: string, session?: ClientSession) {
    return session
      ? await this.update(
          code,
          {
            isRedeemed: true,
            redeemedBy: new Types.ObjectId(userId),
          },
          session,
        )
      : await this.update(code, {
          isRedeemed: true,
          redeemedBy: new Types.ObjectId(userId),
        });
  }
}
