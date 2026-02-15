import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilterQuery, Types } from 'mongoose';
import { Environment } from '../core/config/environment';
import { TokenService } from '../core/utils/token/token.service';
import { LicensePayload } from '../core/utils/token/types';
import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import {
  CouponAdminListItem,
  CouponAdminListResult,
  CouponRepository,
} from './coupon.repository';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import {
  CouponAdminStatus,
  ListAdminCouponsDto,
} from './dtos/list-admin-coupons.dto';
import { ReissueCouponDto } from './dtos/reissue-coupon.dto';
import { RevokeCouponDto } from './dtos/revoke-coupon.dto';
import { Coupon } from './schemas/coupon.schema';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface CouponsStats {
  totalCoupons: number;
  validCoupons: number;
  invalidCoupons: number;
  redeemedCoupons: number;
  revokedCoupons: number;
  availableCoupons: number;
  activeLicenses: number;
  expiredLicenses: number;
}

export interface ReissueCouponResult {
  oldCoupon: Coupon | null | undefined;
  newCoupon: Coupon | null | undefined;
}

export interface DeleteCouponResult {
  deleted: boolean;
}

@Injectable()
export class LicenseService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly tokenService: TokenService,
    private readonly userService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async createCoupon(dto: CreateCouponDto, user: User) {
    const firstCode = this.tokenService.generateCode();
    const firstCoupon = await this.couponRepository.create({
      ...dto,
      code: firstCode,
      duration: 0,
      isFirstCode: true,
      issuedBy: user._id,
    });

    const secondCode = this.tokenService.generateCode();
    const secondCoupon = await this.couponRepository.create({
      ...dto,
      code: secondCode,
      isFirstCode: false,
      firstCouponId: firstCoupon._id,
      issuedBy: user._id,
    });

    return {
      firstCoupon,
      secondCoupon,
    };
  }

  async redeemCoupon(code: string, user: User) {
    const session = await this.couponRepository.startSession();
    session.startTransaction();

    try {
      const coupon = await this.couponRepository.findByCode(code, session);

      if (!coupon) throw new NotFoundException('Coupon not found');
      if (coupon.isRedeemed)
        throw new BadRequestException('Coupon already redeemed');
      if (coupon.isRevoked) throw new BadRequestException('Coupon is revoked');

      const now = new Date();

      if (coupon.isFirstCode) {
        await this.couponRepository.update(
          coupon._id.toString(),
          {
            isRedeemed: true,
            redeemedBy: user._id,
            redeemedAt: now,
          },
          session,
        );

        await session.commitTransaction();
        return { message: 'First code accepted' };
      }

      if (coupon.firstCouponId) {
        const firstCoupon = await this.couponRepository.findOne(
          { _id: coupon.firstCouponId },
          undefined,
          session,
        );

        if (!firstCoupon) {
          throw new BadRequestException(
            'Invalid coupon chain: First coupon not found',
          );
        }

        if (!firstCoupon.isRedeemed) {
          throw new BadRequestException('First coupon must be redeemed first');
        }

        if (firstCoupon.redeemedBy.toString() !== user._id.toString()) {
          throw new BadRequestException(
            'First coupon was redeemed by another user',
          );
        }
      }

      const durationMs = coupon.duration * ONE_DAY_MS;
      let newExpiryDate: Date;

      if (user.license_expires_at && user.license_expires_at > now) {
        newExpiryDate = new Date(
          user.license_expires_at.getTime() + durationMs,
        );
      } else {
        newExpiryDate = new Date(now.getTime() + durationMs);
      }

      await this.couponRepository.update(
        coupon._id.toString(),
        {
          isRedeemed: true,
          redeemedBy: user._id,
          redeemedAt: now,
          expiresAt: newExpiryDate,
        },
        session,
      );

      await this.userService.update(
        user._id.toString(),
        { license_expires_at: newExpiryDate },
        session,
      );

      await session.commitTransaction();

      const payload = {
        id: user._id.toString(),
        expiresAt: newExpiryDate.toISOString(),
      };

      const token = await this.signLicense(payload);

      return {
        license: token,
        expiresAt: newExpiryDate,
      };
    } catch (error) {
      await this.couponRepository.abortSession(session);
      throw error;
    } finally {
      await this.couponRepository.endSession(session);
    }
  }

  async listCouponsForAdmin(
    query: ListAdminCouponsDto,
  ): Promise<CouponAdminListResult> {
    const { page, limit } = this.getPagination(query);
    const filter = this.buildAdminFilter(query);

    return this.couponRepository.findCouponsWithUserInfoPaginated({
      filter,
      search: query.search,
      page,
      limit,
    });
  }

  async listRedeemedCouponsForAdmin(
    query: ListAdminCouponsDto,
  ): Promise<CouponAdminListResult> {
    const { page, limit } = this.getPagination(query);
    const filter = this.buildAdminFilter(query, CouponAdminStatus.REDEEMED);

    return this.couponRepository.findCouponsWithUserInfoPaginated({
      filter,
      search: query.search,
      page,
      limit,
    });
  }

  async getCouponsStatsForAdmin(): Promise<CouponsStats> {
    const now = new Date();

    const [
      totalCoupons,
      validCoupons,
      invalidCoupons,
      redeemedCoupons,
      revokedCoupons,
      availableCoupons,
      activeLicenses,
      expiredLicenses,
    ] = await Promise.all([
      this.couponRepository.count({}),
      this.couponRepository.count({ isRedeemed: true }),
      this.couponRepository.count({ isRevoked: true }),
      this.couponRepository.count({
        $or: [{ isRedeemed: true }, { isRevoked: true }],
      }),
      this.couponRepository.count({ isRedeemed: true }),
      this.couponRepository.count({
        isRedeemed: false,
        $or: [{ isRevoked: false }, { isRevoked: { $exists: false } }],
      }),
      this.couponRepository.count({
        isRedeemed: true,
        expiresAt: { $gt: now },
      }),
      this.couponRepository.count({
        isRedeemed: true,
        expiresAt: { $lte: now },
      }),
    ]);

    return {
      totalCoupons,
      validCoupons,
      invalidCoupons,
      redeemedCoupons,
      revokedCoupons,
      availableCoupons,
      activeLicenses,
      expiredLicenses,
    };
  }

  async revokeCouponForAdmin(
    couponId: string,
    dto: RevokeCouponDto,
    admin: User,
  ): Promise<Coupon | null | undefined> {
    this.assertObjectId(couponId, 'Invalid coupon id');
    const coupon = await this.couponRepository.findById(couponId);

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.isRedeemed) {
      throw new BadRequestException('Cannot revoke a redeemed coupon');
    }

    if (coupon.isRevoked) {
      throw new BadRequestException('Coupon is already revoked');
    }

    const updatedCoupon = await this.couponRepository.update(couponId, {
      isRevoked: true,
      revokedAt: new Date(),
      revokedBy: admin._id,
      revokeReason: dto.reason?.trim() || 'Revoked by admin',
    });

    return updatedCoupon;
  }

  async reissueCouponForAdmin(
    couponId: string,
    dto: ReissueCouponDto,
    admin: User,
  ): Promise<ReissueCouponResult> {
    this.assertObjectId(couponId, 'Invalid coupon id');
    const coupon = await this.couponRepository.findById(couponId);

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.isRedeemed) {
      throw new BadRequestException('Cannot reissue a redeemed coupon');
    }

    if (coupon.isRevoked) {
      throw new BadRequestException('Cannot reissue a revoked coupon');
    }

    if (coupon.isFirstCode) {
      throw new BadRequestException(
        'Reissue is only supported for second coupons',
      );
    }

    const newCode = this.tokenService.generateCode();
    const newCoupon = await this.couponRepository.create({
      code: newCode,
      duration: coupon.duration,
      isFirstCode: coupon.isFirstCode,
      firstCouponId: coupon.firstCouponId,
      issuedBy: admin._id,
      reissuedFromCouponId: coupon._id,
    });

    const oldCoupon = await this.couponRepository.update(couponId, {
      isRevoked: true,
      revokedAt: new Date(),
      revokedBy: admin._id,
      revokeReason: dto.reason?.trim() || 'Reissued by admin',
      reissuedToCouponId: newCoupon?._id,
    });

    return {
      oldCoupon,
      newCoupon,
    };
  }

  async deleteCouponForAdmin(couponId: string): Promise<DeleteCouponResult> {
    this.assertObjectId(couponId, 'Invalid coupon id');
    const coupon = await this.couponRepository.findById(couponId);

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (coupon.isRedeemed) {
      throw new BadRequestException('Cannot delete a redeemed coupon');
    }

    if (coupon.reissuedToCouponId) {
      throw new BadRequestException(
        'Cannot delete a coupon that has already been reissued',
      );
    }

    await this.couponRepository.delete(couponId);
    return { deleted: true };
  }

  async exportCouponsCsvForAdmin(query: ListAdminCouponsDto): Promise<string> {
    const filter = this.buildAdminFilter(query);
    const coupons =
      await this.couponRepository.findCouponsWithUserInfoForExport({
        filter,
        search: query.search,
      });

    const header = [
      'couponId',
      'code',
      'status',
      'durationDays',
      'isFirstCode',
      'createdAt',
      'redeemedAt',
      'expiresAt',
      'issuedByName',
      'issuedByEmail',
      'redeemedByName',
      'redeemedByEmail',
      'revokedAt',
      'revokedByName',
      'revokedByEmail',
      'revokeReason',
    ];

    const rows = coupons.map((coupon) => [
      coupon._id?.toString() || '',
      coupon.code || '',
      this.getCouponStatusLabel(coupon),
      String(coupon.duration ?? ''),
      String(coupon.isFirstCode ?? false),
      this.toCsvDate(coupon.createdAt),
      this.toCsvDate(coupon.redeemedAt),
      this.toCsvDate(coupon.expiresAt),
      coupon.issuedBy?.name || '',
      coupon.issuedBy?.email || '',
      coupon.redeemedBy?.name || '',
      coupon.redeemedBy?.email || '',
      this.toCsvDate(coupon.revokedAt),
      coupon.revokedBy?.name || '',
      coupon.revokedBy?.email || '',
      coupon.revokeReason || '',
    ]);

    return this.toCsv([header, ...rows]);
  }

  async exportCouponStatsCsvForAdmin(): Promise<string> {
    const stats = await this.getCouponsStatsForAdmin();
    const header = ['metric', 'value'];
    const rows = Object.entries(stats).map(([metric, value]) => [
      metric,
      String(value),
    ]);
    return this.toCsv([header, ...rows]);
  }

  private buildAdminFilter(
    query: ListAdminCouponsDto,
    forcedStatus?: CouponAdminStatus,
  ): FilterQuery<Coupon> {
    const status = forcedStatus ?? query.status ?? CouponAdminStatus.ALL;
    const filter: FilterQuery<Coupon> = {};

    if (status === CouponAdminStatus.VALID) {
      filter.isRedeemed = false;
      filter.$or = [{ isRevoked: false }, { isRevoked: { $exists: false } }];
    } else if (status === CouponAdminStatus.INVALID) {
      filter.$or = [{ isRedeemed: true }, { isRevoked: true }];
    } else if (status === CouponAdminStatus.REDEEMED) {
      filter.isRedeemed = true;
    } else if (status === CouponAdminStatus.REVOKED) {
      filter.isRevoked = true;
    }

    const createdRange = this.buildDateRange(
      query.createdFrom,
      query.createdTo,
    );
    if (createdRange) filter.createdAt = createdRange;

    const redeemedRange = this.buildDateRange(
      query.redeemedFrom,
      query.redeemedTo,
    );
    if (redeemedRange) filter.redeemedAt = redeemedRange;

    const expiresRange = this.buildDateRange(
      query.expiresFrom,
      query.expiresTo,
    );
    if (expiresRange) filter.expiresAt = expiresRange;

    return filter;
  }

  private buildDateRange(from?: string, to?: string) {
    if (!from && !to) return undefined;

    const range: { $gte?: Date; $lte?: Date } = {};
    if (from) range.$gte = this.parseDate(from, 'Invalid from date');
    if (to) range.$lte = this.parseDate(to, 'Invalid to date');

    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      throw new BadRequestException('Date range is invalid');
    }

    return range;
  }

  private parseDate(value: string, message: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(message);
    }
    return date;
  }

  private getPagination(query: ListAdminCouponsDto) {
    return {
      page: Math.max(query.page || 1, 1),
      limit: Math.min(Math.max(query.limit || 20, 1), 100),
    };
  }

  private getCouponStatusLabel(coupon: CouponAdminListItem): string {
    if (coupon.isRevoked) return 'revoked';
    if (coupon.isRedeemed) return 'redeemed';
    return 'valid';
  }

  private toCsvDate(date?: Date): string {
    return date ? new Date(date).toISOString() : '';
  }

  private toCsv(rows: string[][]): string {
    return rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');
  }

  private assertObjectId(value: string, message: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(message);
    }
  }

  private getPrivateKey() {
    const base64Key = this.config.get<string>(Environment.PRIVATE_KEY);
    if (!base64Key) throw new Error('PRIVATE_KEY is missing');

    return Buffer.from(base64Key, 'base64').toString('utf-8');
  }
  private signLicense(payload: LicensePayload) {
    const privateKey = this.getPrivateKey();

    return this.tokenService.generateLicenseToken(payload, privateKey);
  }
}
