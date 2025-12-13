import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RedeemCouponDto {
  @ApiProperty({
    description: 'The code of the coupon',
    required: true,
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
