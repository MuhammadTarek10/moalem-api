import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeCouponDto {
  @ApiPropertyOptional({
    description: 'Reason for revoking the coupon',
    example: 'Coupon leaked publicly',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
