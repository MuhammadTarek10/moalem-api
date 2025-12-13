import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResponseDto } from 'src/core/common/dtos/response.dto';
import { GetUser } from 'src/core/decorators/get-user.decorator';
import { ResponseMessage } from 'src/core/decorators/response-message.decorator';
import { Roles } from 'src/core/decorators/roles.decorator';
import { UserRoles } from 'src/users/schemas/user-roles.enum';
import { User } from 'src/users/schemas/user.schema';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { RedeemCouponDto } from './dtos/redeem-coupon.dto';
import {
  CouponResponseDto,
  RedeemCouponResponseDto,
} from './dtos/responses.dto';
import { LicenseService } from './license.service';

@ApiTags('License')
@ApiExtraModels(ResponseDto, CouponResponseDto, RedeemCouponResponseDto)
@Controller('license')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @ApiOperation({ summary: 'Create a new coupon (Admin only)' })
  @ApiCreatedResponse({
    description: 'Coupon created successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(CouponResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('Coupon created successfully')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Post('create-coupon')
  createCoupon(@Body() dto: CreateCouponDto, @GetUser() user: User) {
    return this.licenseService.createCoupon(dto, user);
  }

  @ApiOperation({ summary: 'Redeem a coupon code' })
  @ApiOkResponse({
    description: 'Coupon redeemed successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(RedeemCouponResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('Coupon redeemed successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  @Post('redeem-coupon')
  redeemCoupon(@Body() dto: RedeemCouponDto, @GetUser() user: User) {
    return this.licenseService.redeemCoupon(dto.code, user);
  }
}
