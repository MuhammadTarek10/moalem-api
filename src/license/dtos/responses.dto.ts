import { ApiProperty } from '@nestjs/swagger';

export class CouponResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the coupon',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'The coupon code',
    example: 'SUMMER2024',
  })
  code: string;

  @ApiProperty({
    description: 'The ID of the user who issued the coupon',
    example: '507f1f77bcf86cd799439012',
  })
  issuedBy: string;

  @ApiProperty({
    description: 'The duration of the license in days',
    example: 30,
  })
  duration: number;

  @ApiProperty({
    description: 'Whether the coupon has been redeemed',
    example: false,
  })
  isRedeemed: boolean;

  @ApiProperty({
    description: 'The expiration date of the coupon',
    example: '2024-12-31T23:59:59.999Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'The creation date of the coupon',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last update date of the coupon',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether this is the first code in the chain',
    example: true,
  })
  isFirstCode: boolean;

  @ApiProperty({
    description: 'The ID of the first coupon in the chain',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  firstCouponId?: string;

  @ApiProperty({
    description: 'The ID of the user who redeemed the coupon',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  redeemedBy?: string;

  @ApiProperty({
    description: 'The date when the coupon was redeemed',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  redeemedAt?: Date;
}

export class CreateCouponResponseDto {
  @ApiProperty({ type: CouponResponseDto })
  firstCoupon: CouponResponseDto;

  @ApiProperty({ type: CouponResponseDto })
  secondCoupon: CouponResponseDto;
}

export class RedeemCouponResponseDto {
  @ApiProperty({
    description: 'The license token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    required: false,
  })
  license?: string;

  @ApiProperty({
    description: 'The expiration date of the license',
    example: new Date(),
    required: false,
  })
  expiresAt?: Date;

  @ApiProperty({
    description: 'Message indicating the result of the operation',
    example: 'First code accepted',
    required: false,
  })
  message?: string;
}
