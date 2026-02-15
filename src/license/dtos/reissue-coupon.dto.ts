import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReissueCouponDto {
  @ApiPropertyOptional({
    description: 'Reason for reissuing the coupon',
    example: 'User lost original code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
