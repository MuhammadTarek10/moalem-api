import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, FilterQuery, Model, Types } from 'mongoose';
import { BaseRepository } from '../core/database/base.repository';
import { Coupon } from './schemas/coupon.schema';

export interface CouponAdminUserInfo {
  _id?: Types.ObjectId;
  name?: string;
  email?: string;
}

export interface CouponAdminListItem {
  _id: Types.ObjectId;
  code: string;
  duration: number;
  isRedeemed: boolean;
  isFirstCode: boolean;
  firstCouponId?: Types.ObjectId;
  redeemedAt?: Date;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  issuedBy?: CouponAdminUserInfo;
  redeemedBy?: CouponAdminUserInfo;
}

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
            isRedeemed: false,
          },
          undefined,
          session,
        )
      : await this.find({
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

  async findCouponsWithUserInfo(
    filter: FilterQuery<Coupon> = {},
  ): Promise<CouponAdminListItem[]> {
    return this.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'issuedBy',
          foreignField: '_id',
          as: 'issuedByUser',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'redeemedBy',
          foreignField: '_id',
          as: 'redeemedByUser',
        },
      },
      {
        $unwind: {
          path: '$issuedByUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: '$redeemedByUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          code: 1,
          duration: 1,
          isRedeemed: 1,
          isFirstCode: 1,
          firstCouponId: 1,
          redeemedAt: 1,
          expiresAt: 1,
          createdAt: 1,
          updatedAt: 1,
          issuedBy: {
            _id: '$issuedByUser._id',
            name: '$issuedByUser.name',
            email: '$issuedByUser.email',
          },
          redeemedBy: {
            _id: '$redeemedByUser._id',
            name: '$redeemedByUser.name',
            email: '$redeemedByUser.email',
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]) as Promise<CouponAdminListItem[]>;
  }
}
