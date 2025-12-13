import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UtilsModule } from '../core/utils/utils.module';
import { UsersModule } from '../users/users.module';
import { CouponRepository } from './coupon.repository';
import { LicenseController } from './license.controller';
import { LicenseService } from './license.service';
import { Coupon, CouponSchema } from './schemas/coupon.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]),
    UsersModule,
    UtilsModule,
  ],
  providers: [LicenseService, CouponRepository],
  controllers: [LicenseController],
  exports: [LicenseService],
})
export class LicenseModule {}
