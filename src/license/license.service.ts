import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment } from '../core/config/environment';
import { TokenService } from '../core/utils/token/token.service';
import { LicensePayload } from '../core/utils/token/types';
import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { CouponRepository } from './coupon.repository';
import { CreateCouponDto } from './dtos/create-coupon.dto';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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
