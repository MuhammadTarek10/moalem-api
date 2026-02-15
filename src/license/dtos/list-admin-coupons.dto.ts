import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

export enum CouponAdminStatus {
  ALL = 'all',
  VALID = 'valid',
  INVALID = 'invalid',
  REDEEMED = 'redeemed',
  REVOKED = 'revoked',
}

export class ListAdminCouponsDto {
  @ApiPropertyOptional({
    enum: CouponAdminStatus,
    description:
      'Filter coupons by status: valid=not redeemed/revoked, invalid=redeemed or revoked',
    default: CouponAdminStatus.ALL,
  })
  @IsOptional()
  @IsEnum(CouponAdminStatus)
  status: CouponAdminStatus = CouponAdminStatus.ALL;

  @ApiPropertyOptional({
    description: 'Search by code, issuer name/email, or redeemer name/email',
    example: 'mohamed',
  })
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by createdAt from date (ISO string)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by createdAt to date (ISO string)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  createdTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by redeemedAt from date (ISO string)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  redeemedFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by redeemedAt to date (ISO string)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  redeemedTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by expiresAt from date (ISO string)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  expiresFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by expiresAt to date (ISO string)',
    example: '2026-01-31T23:59:59.999Z',
  })
  @IsOptional()
  expiresTo?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit: number = 20;
}
