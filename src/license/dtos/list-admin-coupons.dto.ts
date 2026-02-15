import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum CouponAdminStatus {
  ALL = 'all',
  VALID = 'valid',
  INVALID = 'invalid',
}

export class ListAdminCouponsDto {
  @ApiProperty({
    enum: CouponAdminStatus,
    description:
      'Filter coupons by status: valid=not redeemed, invalid=already redeemed',
    default: CouponAdminStatus.ALL,
  })
  @IsOptional()
  @IsEnum(CouponAdminStatus)
  status: CouponAdminStatus = CouponAdminStatus.ALL;
}
