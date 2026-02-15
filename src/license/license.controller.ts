import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
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
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ResponseDto } from '../core/common/dtos/response.dto';
import { GetUser } from '../core/decorators/get-user.decorator';
import { ResponseMessage } from '../core/decorators/response-message.decorator';
import { Roles } from '../core/decorators/roles.decorator';
import { UserRoles } from '../users/schemas/user-roles.enum';
import { User } from '../users/schemas/user.schema';
import type { CouponAdminListItem } from './coupon.repository';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { ListAdminCouponsDto } from './dtos/list-admin-coupons.dto';
import { RedeemCouponDto } from './dtos/redeem-coupon.dto';
import {
  CouponResponseDto,
  CreateCouponResponseDto,
  RedeemCouponResponseDto,
} from './dtos/responses.dto';
import type { CouponsStats } from './license.service';
import { LicenseService } from './license.service';

@ApiTags('License')
@ApiExtraModels(
  ResponseDto,
  CouponResponseDto,
  CreateCouponResponseDto,
  RedeemCouponResponseDto,
)
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
            data: { $ref: getSchemaPath(CreateCouponResponseDto) },
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

  @ApiOperation({ summary: 'List coupons with admin filters' })
  @ApiOkResponse({ description: 'Coupons fetched successfully' })
  @ResponseMessage('Coupons fetched successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons')
  listCoupons(
    @Query() query: ListAdminCouponsDto,
  ): Promise<CouponAdminListItem[]> {
    const service = this.licenseService as {
      listCouponsForAdmin: (
        query: ListAdminCouponsDto,
      ) => Promise<CouponAdminListItem[]>;
    };

    return service.listCouponsForAdmin(query);
  }

  @ApiOperation({ summary: 'List redeemed coupons with redeemer info' })
  @ApiOkResponse({ description: 'Redeemed coupons fetched successfully' })
  @ResponseMessage('Redeemed coupons fetched successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons/redeemed')
  listRedeemedCoupons(): Promise<CouponAdminListItem[]> {
    const service = this.licenseService as {
      listRedeemedCouponsForAdmin: () => Promise<CouponAdminListItem[]>;
    };

    return service.listRedeemedCouponsForAdmin();
  }

  @ApiOperation({ summary: 'Get coupon stats for admin dashboard' })
  @ApiOkResponse({ description: 'Coupon stats fetched successfully' })
  @ResponseMessage('Coupon stats fetched successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons/stats')
  getCouponStats(): Promise<CouponsStats> {
    const service = this.licenseService as {
      getCouponsStatsForAdmin: () => Promise<CouponsStats>;
    };

    return service.getCouponsStatsForAdmin();
  }
}
