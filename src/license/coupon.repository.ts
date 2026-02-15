import { InjectModel } from '@nestjs/mongoose';
import {
  ClientSession,
  FilterQuery,
  Model,
  PipelineStage,
  Types,
} from 'mongoose';
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
  isRevoked: boolean;
  isFirstCode: boolean;
  firstCouponId?: Types.ObjectId;
  redeemedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revokeReason?: string;
  revokedBy?: CouponAdminUserInfo;
  reissuedFromCouponId?: Types.ObjectId;
  reissuedToCouponId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  issuedBy?: CouponAdminUserInfo;
  redeemedBy?: CouponAdminUserInfo;
}

export interface CouponAdminListResult {
  items: CouponAdminListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CouponAdminQueryOptions {
  filter?: FilterQuery<Coupon>;
  search?: string;
  page?: number;
  limit?: number;
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

  async findCouponsWithUserInfoPaginated(
    options: CouponAdminQueryOptions = {},
  ): Promise<CouponAdminListResult> {
    const filter = options.filter ?? {};
    const page = Math.max(options.page ?? 1, 1);
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const skip = (page - 1) * limit;
    const searchMatch = this.buildSearchMatch(options.search);

    const searchStages: PipelineStage[] = searchMatch
      ? [{ $match: searchMatch }]
      : [];

    const result = (await this.aggregate([
      { $match: filter },
      ...this.getAdminLookupStages(),
      ...searchStages,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            this.getAdminProjectStage(),
          ],
        },
      },
    ])) as unknown as Array<{
      metadata: Array<{ total: number }>;
      items: CouponAdminListItem[];
    }>;

    const total = result[0]?.metadata[0]?.total ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: result[0]?.items ?? [],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findCouponsWithUserInfoForExport(
    options: CouponAdminQueryOptions = {},
  ): Promise<CouponAdminListItem[]> {
    const filter = options.filter ?? {};
    const searchMatch = this.buildSearchMatch(options.search);
    const searchStages: PipelineStage[] = searchMatch
      ? [{ $match: searchMatch }]
      : [];

    return (await this.aggregate([
      { $match: filter },
      ...this.getAdminLookupStages(),
      ...searchStages,
      { $sort: { createdAt: -1 } },
      this.getAdminProjectStage(),
    ])) as unknown as CouponAdminListItem[];
  }

  private getAdminLookupStages(): PipelineStage[] {
    return [
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
        $lookup: {
          from: 'users',
          localField: 'revokedBy',
          foreignField: '_id',
          as: 'revokedByUser',
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
        $unwind: {
          path: '$revokedByUser',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];
  }

  private buildSearchMatch(search?: string): FilterQuery<Coupon> | null {
    if (!search?.trim()) {
      return null;
    }

    const regex = new RegExp(search.trim(), 'i');
    return {
      $or: [
        { code: regex },
        { 'issuedByUser.name': regex },
        { 'issuedByUser.email': regex },
        { 'redeemedByUser.name': regex },
        { 'redeemedByUser.email': regex },
      ],
    };
  }

  private getAdminProjectStage(): PipelineStage.Project {
    return {
      $project: {
        _id: 1,
        code: 1,
        duration: 1,
        isRedeemed: 1,
        isRevoked: { $ifNull: ['$isRevoked', false] },
        isFirstCode: 1,
        firstCouponId: 1,
        redeemedAt: 1,
        expiresAt: 1,
        revokedAt: 1,
        revokeReason: 1,
        reissuedFromCouponId: 1,
        reissuedToCouponId: 1,
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
        revokedBy: {
          _id: '$revokedByUser._id',
          name: '$revokedByUser.name',
          email: '$revokedByUser.email',
        },
      },
    };
  }
}
