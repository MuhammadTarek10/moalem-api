import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
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
import type { Response } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ResponseDto } from '../core/common/dtos/response.dto';
import { GetUser } from '../core/decorators/get-user.decorator';
import { ResponseMessage } from '../core/decorators/response-message.decorator';
import { Roles } from '../core/decorators/roles.decorator';
import { UserRoles } from '../users/schemas/user-roles.enum';
import { User } from '../users/schemas/user.schema';
import type { CouponAdminListResult } from './coupon.repository';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { ListAdminCouponsDto } from './dtos/list-admin-coupons.dto';
import { RedeemCouponDto } from './dtos/redeem-coupon.dto';
import { ReissueCouponDto } from './dtos/reissue-coupon.dto';
import { RevokeCouponDto } from './dtos/revoke-coupon.dto';
import {
  CouponAdminItemDto,
  CouponResponseDto,
  CouponsStatsResponseDto,
  CreateCouponResponseDto,
  DeleteCouponResponseDto,
  PaginatedAdminCouponsResponseDto,
  RedeemCouponResponseDto,
  ReissueCouponResponseDto,
} from './dtos/responses.dto';
import type {
  CouponsStats,
  DeleteCouponResult,
  ReissueCouponResult,
} from './license.service';
import { LicenseService } from './license.service';

@ApiTags('License')
@ApiExtraModels(
  ResponseDto,
  CouponResponseDto,
  CreateCouponResponseDto,
  RedeemCouponResponseDto,
  CouponAdminItemDto,
  PaginatedAdminCouponsResponseDto,
  CouponsStatsResponseDto,
  ReissueCouponResponseDto,
  DeleteCouponResponseDto,
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
  @ApiOkResponse({
    description: 'Coupons fetched successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(PaginatedAdminCouponsResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('Coupons fetched successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons')
  listCoupons(
    @Query() query: ListAdminCouponsDto,
  ): Promise<CouponAdminListResult> {
    return this.licenseService.listCouponsForAdmin(query);
  }

  @ApiOperation({ summary: 'List redeemed coupons with redeemer info' })
  @ApiOkResponse({
    description: 'Redeemed coupons fetched successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(PaginatedAdminCouponsResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('Redeemed coupons fetched successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons/redeemed')
  listRedeemedCoupons(
    @Query() query: ListAdminCouponsDto,
  ): Promise<CouponAdminListResult> {
    return this.licenseService.listRedeemedCouponsForAdmin(query);
  }

  @ApiOperation({ summary: 'Get coupon stats for admin dashboard' })
  @ApiOkResponse({
    description: 'Coupon stats fetched successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(CouponsStatsResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('Coupon stats fetched successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons/stats')
  getCouponStats(): Promise<CouponsStats> {
    return this.licenseService.getCouponsStatsForAdmin();
  }

  @ApiOperation({ summary: 'Export coupons list as CSV' })
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons/export/csv')
  async exportCouponsCsv(
    @Query() query: ListAdminCouponsDto,
    @Res() res: Response,
  ): Promise<void> {
    const csv = await this.licenseService.exportCouponsCsvForAdmin(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="coupons-export.csv"',
    );
    res.status(HttpStatus.OK).send(csv);
  }

  @ApiOperation({ summary: 'Export coupon stats as CSV' })
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Get('admin/coupons/stats/export/csv')
  async exportCouponStatsCsv(@Res() res: Response): Promise<void> {
    const csv = await this.licenseService.exportCouponStatsCsvForAdmin();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="coupon-stats-export.csv"',
    );
    res.status(HttpStatus.OK).send(csv);
  }

  @ApiOperation({ summary: 'Revoke an unused coupon' })
  @ApiOkResponse({
    description: 'Coupon revoked successfully',
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
  @ResponseMessage('Coupon revoked successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Patch('admin/coupons/:couponId/revoke')
  revokeCoupon(
    @Param('couponId') couponId: string,
    @Body() dto: RevokeCouponDto,
    @GetUser() admin: User,
  ) {
    return this.licenseService.revokeCouponForAdmin(couponId, dto, admin);
  }

  @ApiOperation({ summary: 'Reissue an unused second coupon with a new code' })
  @ApiOkResponse({
    description: 'Coupon reissued successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(ReissueCouponResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('Coupon reissued successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Post('admin/coupons/:couponId/reissue')
  reissueCoupon(
    @Param('couponId') couponId: string,
    @Body() dto: ReissueCouponDto,
    @GetUser() admin: User,
  ): Promise<ReissueCouponResult> {
    return this.licenseService.reissueCouponForAdmin(couponId, dto, admin);
  }

  @ApiOperation({ summary: 'Delete an unused coupon' })
  @ApiOkResponse({
    description: 'Coupon deleted successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(DeleteCouponResponseDto) },
          },
        },
      ],
    },
  })
  @ResponseMessage('Coupon deleted successfully')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(UserRoles.ADMIN)
  @UseGuards(JwtGuard, RolesGuard)
  @Delete('admin/coupons/:couponId')
  deleteCoupon(
    @Param('couponId') couponId: string,
  ): Promise<DeleteCouponResult> {
    return this.licenseService.deleteCouponForAdmin(couponId);
  }
}
