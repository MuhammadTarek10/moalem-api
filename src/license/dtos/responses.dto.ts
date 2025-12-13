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
}

export class RedeemCouponResponseDto {
  @ApiProperty({
    description: 'The license token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  license: string;

  @ApiProperty({
    description: 'The expiration date of the license',
    example: new Date(),
  })
  expiresAt: Date;
}
