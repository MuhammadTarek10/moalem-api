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

@Injectable()
export class LicenseService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly tokenService: TokenService,
    private readonly userService: UsersService,
    private readonly config: ConfigService,
  ) {}

  async createCoupon(dto: CreateCouponDto, user: User) {
    const code = this.tokenService.generateCode();
    const expiresAt = new Date(Date.now() + dto.duration * 24 * 60 * 60 * 1000);

    const coupon = await this.couponRepository.create({
      ...dto,
      code,
      issuedBy: user._id,
      expiresAt,
    });

    return coupon;
  }

  async redeemCoupon(code: string, user: User) {
    const session = await this.couponRepository.startSession();
    session.startTransaction();

    try {
      const coupon = await this.couponRepository.findByCode(code, session);

      if (!coupon) throw new NotFoundException('Coupon not found');
      if (coupon.isRedeemed)
        throw new BadRequestException('Coupon already redeemed');

      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new BadRequestException('Coupon expired');
      }

      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      const durationMs = coupon.duration * ONE_DAY_MS;

      const now = new Date();
      let newExpiryDate: Date;

      if (user.licenseExpiresAt && user.licenseExpiresAt > now) {
        newExpiryDate = new Date(user.licenseExpiresAt.getTime() + durationMs);
      } else {
        newExpiryDate = new Date(now.getTime() + durationMs);
      }

      await this.couponRepository.update(
        coupon._id.toString(),
        {
          isRedeemed: true,
          redeemedBy: user._id,
          redeemedAt: now,
        },
        session,
      );

      await this.userService.update(
        user._id.toString(),
        { licenseExpiresAt: newExpiryDate },
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
