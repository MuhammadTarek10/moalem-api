import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({
    description: 'The duration of the coupon in days',
    required: false,
    example: 30,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1, { message: 'Duration must be at least 1 day' })
  @Max(100, { message: 'Duration must be at most 100 days' })
  duration: number = 30;
}
