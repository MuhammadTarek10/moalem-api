import { HttpStatus, INestApplication } from '@nestjs/common';
import { Connection, Model } from 'mongoose';
import * as pactum from 'pactum';
import { like } from 'pactum-matchers';
import { UserRoles } from '../src/users/schemas/user-roles.enum';
import { User } from '../src/users/schemas/user.schema';
import setup from './setup';

/**
 * License E2E Tests
 *
 * NOTE: The redeemCoupon functionality uses MongoDB transactions which require
 * a replica set. If running against a standalone MongoDB instance, the redemption
 * tests will fail with "Transaction numbers are only allowed on a replica set member or mongos".
 *
 * To run all tests successfully, ensure MongoDB is configured as a replica set.
 * For standalone MongoDB, only coupon creation tests will pass.
 */
describe('License (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let userModel: Model<User>;
  // let couponModel: Model<Coupon>;
  const port = 3335;

  const adminUser = {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'Admin@123',
    whatsapp_number: '+201111111111',
  };

  const regularUser = {
    name: 'Regular User',
    email: 'user@example.com',
    password: 'User@123',
    whatsapp_number: '+201222222222',
  };

  // const secondUser = {
  //   name: 'Second User',
  //   email: 'second@example.com',
  //   password: 'Second@123',
  //   whatsapp_number: '+201333333333',
  // };

  beforeAll(async () => {
    const result = await setup(port);
    app = result.app;
    connection = result.connection;
    userModel = connection.model<User>('User');
    // couponModel = connection.model<Coupon>('Coupon');
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
    await app.close();
    pactum.request.setBaseUrl('');
  });

  beforeEach(async () => {
    await connection.dropDatabase();
  });

  /**
   * Helper function to create and authenticate an admin user
   */
  async function createAdminUser(): Promise<string> {
    // Sign up admin user
    await pactum
      .spec()
      .post('/auth/sign-up')
      .withBody(adminUser)
      .expectStatus(HttpStatus.CREATED)
      .stores('adminAccessToken', 'data.access_token');

    // Update user role to admin directly in database
    await userModel.updateOne(
      { email: adminUser.email },
      { $set: { role: UserRoles.ADMIN } },
    );

    // Sign in again to get token with updated role
    await pactum
      .spec()
      .post('/auth/sign-in')
      .withBody({
        email: adminUser.email,
        password: adminUser.password,
      })
      .expectStatus(HttpStatus.OK)
      .stores('adminAccessToken', 'data.access_token');

    return pactum.stash.getDataStore()['adminAccessToken'] as string;
  }

  /**
   * Helper function to create and authenticate a regular user
   */
  async function createRegularUser(): Promise<string> {
    await pactum
      .spec()
      .post('/auth/sign-up')
      .withBody(regularUser)
      .expectStatus(HttpStatus.CREATED)
      .stores('userAccessToken', 'data.access_token');

    return pactum.stash.getDataStore()['userAccessToken'] as string;
  }

  /**
   * Helper function to create a second regular user
   */
  // async function createSecondUser(): Promise<string> {
  //   await pactum
  //     .spec()
  //     .post('/auth/sign-up')
  //     .withBody(secondUser)
  //     .expectStatus(HttpStatus.CREATED)
  //     .stores('secondUserAccessToken', 'data.access_token');

  //   return pactum.stash.getDataStore()['secondUserAccessToken'] as string;
  // }

  describe('POST /license/create-coupon', () => {
    describe('Authorization', () => {
      it('should return 401 when no token is provided', () => {
        return pactum
          .spec()
          .post('/license/create-coupon')
          .withBody({ duration: 30 })
          .expectStatus(HttpStatus.UNAUTHORIZED);
      });

      it('should return 401 when invalid token is provided', () => {
        return pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('invalid-token')
          .withBody({ duration: 30 })
          .expectStatus(HttpStatus.UNAUTHORIZED);
      });

      it('should return 403 when regular user tries to create coupon', async () => {
        await createRegularUser();

        return pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{userAccessToken}')
          .withBody({ duration: 30 })
          .expectStatus(HttpStatus.FORBIDDEN)
          .expectJsonMatch({
            message: 'You do not have permission to access this resource',
          });
      });
    });

    describe('Coupon Creation', () => {
      beforeEach(async () => {
        await createAdminUser();
      });

      it('should create coupon successfully with custom duration', () => {
        return pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({ duration: 60 })
          .expectStatus(HttpStatus.CREATED)
          .expectJsonMatch({
            message: 'Coupon created successfully',
            data: {
              _id: like('507f1f77bcf86cd799439011'),
              code: like('ABC123'),
              duration: 60,
              isRedeemed: false,
              issuedBy: like('507f1f77bcf86cd799439011'),
              expiresAt: like('2024-01-01T00:00:00.000Z'),
            },
          })
          .stores('createdCouponCode', 'data.code');
      });

      it('should create coupon with default duration when not specified', () => {
        return pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({})
          .expectStatus(HttpStatus.CREATED)
          .expectJsonMatch({
            message: 'Coupon created successfully',
            data: {
              duration: 30,
              isRedeemed: false,
            },
          });
      });

      it('should create multiple coupons with unique codes', async () => {
        // Create first coupon
        await pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({ duration: 30 })
          .expectStatus(HttpStatus.CREATED)
          .stores('firstCouponCode', 'data.code');

        // Create second coupon
        await pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({ duration: 30 })
          .expectStatus(HttpStatus.CREATED)
          .stores('secondCouponCode', 'data.code');

        // Codes should be different
        const firstCode = pactum.stash.getDataStore()[
          'firstCouponCode'
        ] as string;
        const secondCode = pactum.stash.getDataStore()[
          'secondCouponCode'
        ] as string;
        expect(firstCode).not.toBe(secondCode);
      });

      it('should set correct expiration date based on duration', async () => {
        const durationDays = 45;
        const beforeCreate = Date.now();

        await pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({ duration: durationDays })
          .expectStatus(HttpStatus.CREATED)
          .stores('couponExpiresAt', 'data.expiresAt');

        const expiresAt = new Date(
          pactum.stash.getDataStore()['couponExpiresAt'] as string,
        );
        const expectedMinExpiry = new Date(
          beforeCreate + durationDays * 24 * 60 * 60 * 1000,
        );

        // Allow 5 second tolerance for test execution time
        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
          expectedMinExpiry.getTime() - 5000,
        );
        expect(expiresAt.getTime()).toBeLessThanOrEqual(
          expectedMinExpiry.getTime() + 5000,
        );
      });

      it('should track who issued the coupon', async () => {
        // Get admin user from database
        const admin = await userModel.findOne({ email: adminUser.email });

        await pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({ duration: 30 })
          .expectStatus(HttpStatus.CREATED)
          .expectJsonMatch({
            data: {
              issuedBy: admin?._id.toString(),
            },
          });
      });
    });

    describe('Validation', () => {
      beforeEach(async () => {
        await createAdminUser();
      });

      it('should accept duration as a number', () => {
        return pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({ duration: 15 })
          .expectStatus(HttpStatus.CREATED)
          .expectJsonMatch({
            data: {
              duration: 15,
            },
          });
      });

      it('should handle empty request body', () => {
        return pactum
          .spec()
          .post('/license/create-coupon')
          .withBearerToken('$S{adminAccessToken}')
          .withBody({})
          .expectStatus(HttpStatus.CREATED)
          .expectJsonMatch({
            data: {
              duration: 30,
            },
          });
      });
    });
  });

  // describe('POST /license/redeem-coupon', () => {
  //   describe('Authorization', () => {
  //     it('should return 401 when no token is provided', () => {
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBody({ code: 'TESTCODE' })
  //         .expectStatus(HttpStatus.UNAUTHORIZED);
  //     });

  //     it('should return 401 when invalid token is provided', () => {
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('invalid-token')
  //         .withBody({ code: 'TESTCODE' })
  //         .expectStatus(HttpStatus.UNAUTHORIZED);
  //     });
  //   });

  //   // These tests require MongoDB transactions (replica set)
  //   describe('Coupon Redemption', () => {
  //     beforeEach(async () => {
  //       if (skipIfNoTransactions()) return;
  //       await createAdminUser();
  //       await createRegularUser();
  //     });

  //     it('should redeem coupon successfully and return license', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon as admin
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('couponCode', 'data.code');

  //       // Redeem coupon as regular user
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{couponCode}' })
  //         .expectStatus(HttpStatus.OK)
  //         .expectJsonMatch({
  //           message: 'Coupon redeemed successfully',
  //           data: {
  //             license: like('eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9'),
  //             expiresAt: like('2024-01-01T00:00:00.000Z'),
  //           },
  //         });
  //     });

  //     it('should return 404 when coupon code does not exist', async () => {
  //       if (skipIfNoTransactions()) return;
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: 'NONEXISTENT' })
  //         .expectStatus(HttpStatus.NOT_FOUND)
  //         .expectJsonMatch({
  //           message: 'Coupon not found',
  //         });
  //     });

  //     it('should return 400 when coupon is already redeemed', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('reusedCouponCode', 'data.code');

  //       // First redemption should succeed
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{reusedCouponCode}' })
  //         .expectStatus(HttpStatus.OK);

  //       // Second redemption should fail
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{reusedCouponCode}' })
  //         .expectStatus(HttpStatus.BAD_REQUEST)
  //         .expectJsonMatch({
  //           message: 'Coupon already redeemed',
  //         });
  //     });

  //     it('should return 400 when coupon is expired', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('expiredCouponCode', 'data.code');

  //       // Manually expire the coupon in database
  //       await couponModel.updateOne(
  //         {
  //           code: pactum.stash.getDataStore()['expiredCouponCode'] as string,
  //         },
  //         { $set: { expiresAt: new Date(Date.now() - 1000) } },
  //       );

  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{expiredCouponCode}' })
  //         .expectStatus(HttpStatus.BAD_REQUEST)
  //         .expectJsonMatch({
  //           message: 'Coupon expired',
  //         });
  //     });

  //     it('should set correct license expiration date for new user', async () => {
  //       if (skipIfNoTransactions()) return;
  //       const durationDays = 30;

  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: durationDays })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('newUserCouponCode', 'data.code');

  //       const beforeRedeem = Date.now();

  //       // Redeem coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{newUserCouponCode}' })
  //         .expectStatus(HttpStatus.OK)
  //         .stores('licenseExpiresAt', 'data.expiresAt');

  //       const expiresAt = new Date(
  //         pactum.stash.getDataStore()['licenseExpiresAt'] as string,
  //       );
  //       const expectedExpiry = new Date(
  //         beforeRedeem + durationDays * 24 * 60 * 60 * 1000,
  //       );

  //       // Allow 5 second tolerance
  //       expect(expiresAt.getTime()).toBeGreaterThanOrEqual(
  //         expectedExpiry.getTime() - 5000,
  //       );
  //       expect(expiresAt.getTime()).toBeLessThanOrEqual(
  //         expectedExpiry.getTime() + 5000,
  //       );
  //     });

  //     it('should extend existing license when redeeming another coupon', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create first coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('firstLicenseCoupon', 'data.code');

  //       // Redeem first coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{firstLicenseCoupon}' })
  //         .expectStatus(HttpStatus.OK)
  //         .stores('firstLicenseExpiry', 'data.expiresAt');

  //       // Create second coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 15 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('secondLicenseCoupon', 'data.code');

  //       // Redeem second coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{secondLicenseCoupon}' })
  //         .expectStatus(HttpStatus.OK)
  //         .stores('secondLicenseExpiry', 'data.expiresAt');

  //       const firstExpiry = new Date(
  //         pactum.stash.getDataStore()['firstLicenseExpiry'] as string,
  //       );
  //       const secondExpiry = new Date(
  //         pactum.stash.getDataStore()['secondLicenseExpiry'] as string,
  //       );

  //       // Second expiry should be ~15 days after first expiry
  //       const expectedExtension = 15 * 24 * 60 * 60 * 1000;
  //       const actualExtension = secondExpiry.getTime() - firstExpiry.getTime();

  //       // Allow 5 second tolerance
  //       expect(actualExtension).toBeGreaterThanOrEqual(
  //         expectedExtension - 5000,
  //       );
  //       expect(actualExtension).toBeLessThanOrEqual(expectedExtension + 5000);
  //     });

  //     it('should update user licenseExpiresAt in database', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('updateUserCoupon', 'data.code');

  //       // Verify user has no license before redemption
  //       let user = await userModel.findOne({ email: regularUser.email });
  //       expect(user?.licenseExpiresAt).toBeUndefined();

  //       // Redeem coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{updateUserCoupon}' })
  //         .expectStatus(HttpStatus.OK);

  //       // Verify user license is updated
  //       user = await userModel.findOne({ email: regularUser.email });
  //       expect(user?.licenseExpiresAt).toBeDefined();
  //       expect(user?.licenseExpiresAt).toBeInstanceOf(Date);
  //     });

  //     it('should mark coupon as redeemed in database', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('markRedeemedCoupon', 'data.code');

  //       const couponCode = pactum.stash.getDataStore()[
  //         'markRedeemedCoupon'
  //       ] as string;

  //       // Verify coupon is not redeemed before
  //       let coupon = await couponModel.findOne({ code: couponCode });
  //       expect(coupon?.isRedeemed).toBe(false);
  //       expect(coupon?.redeemedBy).toBeUndefined();
  //       expect(coupon?.redeemedAt).toBeUndefined();

  //       // Redeem coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: couponCode })
  //         .expectStatus(HttpStatus.OK);

  //       // Verify coupon is marked as redeemed
  //       coupon = await couponModel.findOne({ code: couponCode });
  //       expect(coupon?.isRedeemed).toBe(true);
  //       expect(coupon?.redeemedBy).toBeDefined();
  //       expect(coupon?.redeemedAt).toBeInstanceOf(Date);
  //     });

  //     it('should track who redeemed the coupon', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('trackRedeemerCoupon', 'data.code');

  //       const couponCode = pactum.stash.getDataStore()[
  //         'trackRedeemerCoupon'
  //       ] as string;

  //       // Redeem coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: couponCode })
  //         .expectStatus(HttpStatus.OK);

  //       // Get user and coupon from database
  //       const user = await userModel.findOne({ email: regularUser.email });
  //       const coupon = await couponModel.findOne({ code: couponCode });

  //       expect(coupon?.redeemedBy?.toString()).toBe(user?._id.toString());
  //     });
  //   });

  //   // These tests require MongoDB transactions (replica set)
  //   describe('Different Users', () => {
  //     beforeEach(async () => {
  //       if (skipIfNoTransactions()) return;
  //       await createAdminUser();
  //       await createRegularUser();
  //       await createSecondUser();
  //     });

  //     it('should not allow different user to redeem already redeemed coupon', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('sharedCoupon', 'data.code');

  //       // First user redeems
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{sharedCoupon}' })
  //         .expectStatus(HttpStatus.OK);

  //       // Second user tries to redeem same coupon
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{secondUserAccessToken}')
  //         .withBody({ code: '$S{sharedCoupon}' })
  //         .expectStatus(HttpStatus.BAD_REQUEST)
  //         .expectJsonMatch({
  //           message: 'Coupon already redeemed',
  //         });
  //     });

  //     it('should allow different users to redeem different coupons', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create first coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('userOneCoupon', 'data.code');

  //       // Create second coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('userTwoCoupon', 'data.code');

  //       // First user redeems first coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: '$S{userOneCoupon}' })
  //         .expectStatus(HttpStatus.OK);

  //       // Second user redeems second coupon
  //       await pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{secondUserAccessToken}')
  //         .withBody({ code: '$S{userTwoCoupon}' })
  //         .expectStatus(HttpStatus.OK);

  //       // Verify both users have licenses
  //       const user1 = await userModel.findOne({ email: regularUser.email });
  //       const user2 = await userModel.findOne({ email: secondUser.email });

  //       expect(user1?.licenseExpiresAt).toBeDefined();
  //       expect(user2?.licenseExpiresAt).toBeDefined();
  //     });

  //     it('should allow admin to also redeem coupons', async () => {
  //       if (skipIfNoTransactions()) return;
  //       // Create coupon
  //       await pactum
  //         .spec()
  //         .post('/license/create-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ duration: 30 })
  //         .expectStatus(HttpStatus.CREATED)
  //         .stores('adminRedeemCoupon', 'data.code');

  //       // Admin redeems coupon
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{adminAccessToken}')
  //         .withBody({ code: '$S{adminRedeemCoupon}' })
  //         .expectStatus(HttpStatus.OK)
  //         .expectJsonMatch({
  //           message: 'Coupon redeemed successfully',
  //           data: {
  //             license: like('token'),
  //             expiresAt: like('2024-01-01T00:00:00.000Z'),
  //           },
  //         });
  //     });
  //   });
  // });

  // describe('License Integration Flow', () => {
  //   it('should complete full flow: admin creates coupon -> user redeems -> license issued', async () => {
  //     // Step 1: Create admin
  //     await createAdminUser();

  //     // Step 2: Create regular user
  //     await createRegularUser();

  //     // Step 3: Admin creates coupon
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 30 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('flowCouponCode', 'data.code')
  //       .expectJsonMatch({
  //         message: 'Coupon created successfully',
  //         data: {
  //           isRedeemed: false,
  //         },
  //       });

  //     // Step 4: User redeems coupon
  //     await pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '$S{flowCouponCode}' })
  //       .expectStatus(HttpStatus.OK)
  //       .expectJsonMatch({
  //         message: 'Coupon redeemed successfully',
  //         data: {
  //           license: like('token'),
  //         },
  //       });

  //     // Step 5: Verify coupon is marked as redeemed
  //     const couponCode = pactum.stash.getDataStore()[
  //       'flowCouponCode'
  //     ] as string;
  //     const coupon = await couponModel.findOne({ code: couponCode });
  //     expect(coupon?.isRedeemed).toBe(true);

  //     // Step 6: Verify user has license
  //     const user = await userModel.findOne({ email: regularUser.email });
  //     expect(user?.licenseExpiresAt).toBeDefined();
  //   });

  //   it('should handle multiple coupon redemptions stacking license duration', async () => {
  //     await createAdminUser();
  //     await createRegularUser();

  //     // Create and redeem first 30-day coupon
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 30 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('stackCoupon1', 'data.code');

  //     await pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '$S{stackCoupon1}' })
  //       .expectStatus(HttpStatus.OK);

  //     // Create and redeem second 30-day coupon
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 30 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('stackCoupon2', 'data.code');

  //     await pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '$S{stackCoupon2}' })
  //       .expectStatus(HttpStatus.OK);

  //     // Create and redeem third 30-day coupon
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 30 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('stackCoupon3', 'data.code');

  //     await pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '$S{stackCoupon3}' })
  //       .expectStatus(HttpStatus.OK)
  //       .stores('finalExpiresAt', 'data.expiresAt');

  //     // Verify license is approximately 90 days from now
  //     const finalExpiry = new Date(
  //       pactum.stash.getDataStore()['finalExpiresAt'] as string,
  //     );
  //     const expectedExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  //     // Allow 10 second tolerance for test execution
  //     expect(finalExpiry.getTime()).toBeGreaterThanOrEqual(
  //       expectedExpiry.getTime() - 10000,
  //     );
  //     expect(finalExpiry.getTime()).toBeLessThanOrEqual(
  //       expectedExpiry.getTime() + 10000,
  //     );
  //   });

  //   it('should issue new license starting from now when previous license is expired', async () => {
  //     await createAdminUser();
  //     await createRegularUser();

  //     // Create first coupon and redeem
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 30 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('expiredUserCoupon', 'data.code');

  //     await pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '$S{expiredUserCoupon}' })
  //       .expectStatus(HttpStatus.OK);

  //     // Manually expire the user's license
  //     await userModel.updateOne(
  //       { email: regularUser.email },
  //       { $set: { licenseExpiresAt: new Date(Date.now() - 1000) } },
  //     );

  //     // Create new coupon
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 15 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('newLicenseCoupon', 'data.code');

  //     const beforeRedeem = Date.now();

  //     // Redeem new coupon
  //     await pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '$S{newLicenseCoupon}' })
  //       .expectStatus(HttpStatus.OK)
  //       .stores('newLicenseExpiry', 'data.expiresAt');

  //     // Verify license is 15 days from now, not from expired date
  //     const newExpiry = new Date(
  //       pactum.stash.getDataStore()['newLicenseExpiry'] as string,
  //     );
  //     const expectedExpiry = new Date(beforeRedeem + 15 * 24 * 60 * 60 * 1000);

  //     // Allow 5 second tolerance
  //     expect(newExpiry.getTime()).toBeGreaterThanOrEqual(
  //       expectedExpiry.getTime() - 5000,
  //     );
  //     expect(newExpiry.getTime()).toBeLessThanOrEqual(
  //       expectedExpiry.getTime() + 5000,
  //     );
  //   });
  // });

  // describe('Edge Cases', () => {
  //   beforeEach(async () => {
  //     await createAdminUser();
  //     await createRegularUser();
  //   });

  //   it('should handle empty code in redeem request', () => {
  //     return pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '' })
  //       .expectStatus(HttpStatus.BAD_REQUEST);
  //   });

  //   it('should handle whitespace-only code', async () => {
  //     // Whitespace-only code passes IsNotEmpty validation but won't be found
  //     return pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '   ' })
  //       .expectStatus(HttpStatus.NOT_FOUND);
  //   });

  //   it('should handle missing code in redeem request', () => {
  //     return pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({})
  //       .expectStatus(HttpStatus.BAD_REQUEST);
  //   });

  //   it('should handle case-sensitive coupon codes', async () => {
  //     // Create coupon
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 30 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('caseSensitiveCoupon', 'data.code');

  //     const originalCode = pactum.stash.getDataStore()[
  //       'caseSensitiveCoupon'
  //     ] as string;
  //     const lowerCaseCode = originalCode.toLowerCase();

  //     // Try to redeem with lowercase (assuming codes are uppercase)
  //     if (originalCode !== lowerCaseCode) {
  //       return pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: lowerCaseCode })
  //         .expectStatus(HttpStatus.NOT_FOUND);
  //     }
  //   });

  //   it('should handle very long coupon codes gracefully', async () => {
  //     const veryLongCode = 'A'.repeat(1000);

  //     return pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: veryLongCode })
  //       .expectStatus(HttpStatus.NOT_FOUND);
  //   });

  //   it('should handle special characters in coupon code', async () => {
  //     return pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: '<script>alert("xss")</script>' })
  //       .expectStatus(HttpStatus.NOT_FOUND);
  //   });

  //   it('should handle SQL injection attempt in coupon code', async () => {
  //     return pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: "'; DROP TABLE coupons; --" })
  //       .expectStatus(HttpStatus.NOT_FOUND);
  //   });

  //   it('should handle NoSQL injection attempt in coupon code', () => {
  //     return pactum
  //       .spec()
  //       .post('/license/redeem-coupon')
  //       .withBearerToken('$S{userAccessToken}')
  //       .withBody({ code: { $gt: '' } })
  //       .expectStatus(HttpStatus.BAD_REQUEST);
  //   });

  //   it('should handle concurrent redemption attempts gracefully', async () => {
  //     // Create coupon
  //     await pactum
  //       .spec()
  //       .post('/license/create-coupon')
  //       .withBearerToken('$S{adminAccessToken}')
  //       .withBody({ duration: 30 })
  //       .expectStatus(HttpStatus.CREATED)
  //       .stores('concurrentCoupon', 'data.code');

  //     await createSecondUser();

  //     const couponCode = pactum.stash.getDataStore()[
  //       'concurrentCoupon'
  //     ] as string;

  //     // Attempt concurrent redemptions
  //     const [result1, result2] = await Promise.allSettled([
  //       pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{userAccessToken}')
  //         .withBody({ code: couponCode })
  //         .returns('res.statusCode'),
  //       pactum
  //         .spec()
  //         .post('/license/redeem-coupon')
  //         .withBearerToken('$S{secondUserAccessToken}')
  //         .withBody({ code: couponCode })
  //         .returns('res.statusCode'),
  //     ]);

  //     // One should succeed (200) and one should fail (400)
  //     const statuses = [
  //       result1.status === 'fulfilled' ? result1.value : 500,
  //       result2.status === 'fulfilled' ? result2.value : 500,
  //     ];

  //     expect(statuses).toContain(HttpStatus.OK);
  //     expect(statuses).toContain(HttpStatus.BAD_REQUEST);
  //   });
  // });
});
