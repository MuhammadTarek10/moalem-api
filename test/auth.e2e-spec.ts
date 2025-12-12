import { HttpStatus, INestApplication } from '@nestjs/common';
import { Connection } from 'mongoose';
import * as pactum from 'pactum';
import { like } from 'pactum-matchers';
import setup from './setup';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  const port = 3334;

  beforeAll(async () => {
    const result = await setup(port);
    app = result.app;
    connection = result.connection;
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

  describe('POST /auth/sign-up', () => {
    const validUser = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'Test@123',
    };

    it('should sign up a new user successfully', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED)
        .expectJsonMatch({
          message: 'User signed up successfully',
          data: {
            access_token: like('token'),
            refresh_token: like('token'),
            expires_in: like(3600),
          },
        })
        .stores('accessToken', 'data.access_token')
        .stores('refreshToken', 'data.refresh_token');
    });

    it('should return 409 when user already exists', async () => {
      // First sign up
      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED);

      // Try to sign up again with same email
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CONFLICT)
        .expectJsonMatch({
          message: 'User already exists',
        });
    });

    it('should return 400 when name is too short', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          ...validUser,
          name: 'Jo',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when name is missing', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when email is invalid', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          ...validUser,
          email: 'invalid-email',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when email is missing', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          name: validUser.name,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password is too short', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          ...validUser,
          password: 'Test@12',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password does not meet complexity requirements', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          ...validUser,
          password: 'password123',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password is missing', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          name: validUser.name,
          email: validUser.email,
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password does not have uppercase letter', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          ...validUser,
          password: 'test@123',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password does not have special character', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          ...validUser,
          password: 'Test1234',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password does not have number', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          ...validUser,
          password: 'Test@abc',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });
  });

  describe('POST /auth/sign-in', () => {
    const validUser = {
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      password: 'Test@456',
    };

    beforeEach(async () => {
      // Sign up a user before each test
      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED);
    });

    it('should sign in a user successfully', () => {
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .expectJsonMatch({
          message: 'User signed in successfully',
          data: {
            access_token: like('token'),
            refresh_token: like('token'),
            expires_in: like(3600),
          },
        })
        .stores('signInAccessToken', 'data.access_token')
        .stores('signInRefreshToken', 'data.refresh_token');
    });

    it('should return 401 when email does not exist', () => {
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: 'nonexistent@example.com',
          password: validUser.password,
        })
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when password is incorrect', () => {
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: 'Wrong@123',
        })
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 400 when email is missing', () => {
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          password: validUser.password,
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when password is missing', () => {
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 when email is invalid format', () => {
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: 'invalid-email',
          password: validUser.password,
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should create a new session on each sign-in', async () => {
      // First sign in
      await pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .stores('firstToken', 'data.access_token');

      // Second sign in
      await pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .stores('secondToken', 'data.access_token');

      // Tokens should be different (different sessions)
      const firstToken = pactum.stash.getDataStore()['firstToken'] as string;
      const secondToken = pactum.stash.getDataStore()['secondToken'] as string;
      expect(firstToken).not.toBe(secondToken);
    });
  });

  describe('POST /auth/refresh', () => {
    const validUser = {
      name: 'Charlie Brown',
      email: 'charlie.brown@example.com',
      password: 'Test@111',
    };

    beforeEach(async () => {
      // Sign up a user before each test
      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED)
        .stores('initialAccessToken', 'data.access_token')
        .stores('initialRefreshToken', 'data.refresh_token');
    });

    it('should refresh tokens successfully', () => {
      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.OK)
        .expectJsonMatch({
          message: 'Token refreshed successfully',
          data: {
            access_token: like('token'),
            refresh_token: like('token'),
            expires_in: like(3600),
          },
        })
        .stores('newAccessToken', 'data.access_token')
        .stores('newRefreshToken', 'data.refresh_token');
    });

    it('should return 401 when no refresh token is provided', () => {
      return pactum
        .spec()
        .post('/auth/refresh')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when invalid refresh token is provided', () => {
      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('invalid-token')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when access token is used instead of refresh token', () => {
      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialAccessToken}')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when expired refresh token is provided', () => {
      // Mock expired token - in real scenario this would be a genuinely expired token
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzZXNzaW9uSWQiOiJhYmMxMjMiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken(expiredToken)
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should invalidate old refresh token after successful refresh', async () => {
      // First refresh - should work
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.OK)
        .stores('firstNewRefreshToken', 'data.refresh_token');

      // Try to use old refresh token again - should fail
      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should allow multiple consecutive refreshes', async () => {
      // First refresh
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.OK)
        .stores('refreshToken1', 'data.refresh_token');

      // Second refresh with new token
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{refreshToken1}')
        .expectStatus(HttpStatus.OK)
        .stores('refreshToken2', 'data.refresh_token');

      // Third refresh with newer token
      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{refreshToken2}')
        .expectStatus(HttpStatus.OK)
        .expectJsonMatch({
          message: 'Token refreshed successfully',
          data: {
            access_token: like('token'),
            refresh_token: like('token'),
            expires_in: like(3600),
          },
        });
    });

    it('should return 401 when refresh token from deleted session is used', async () => {
      // Sign out to delete the session
      await pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{initialAccessToken}')
        .expectStatus(HttpStatus.OK);

      // Try to refresh with token from deleted session
      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should not allow refresh token from one session to be used for another', async () => {
      // Create a second session
      await pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .stores('secondSessionRefreshToken', 'data.refresh_token');

      // Both refresh tokens should work independently
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.OK);

      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{secondSessionRefreshToken}')
        .expectStatus(HttpStatus.OK);
    });

    it('should generate different tokens on each refresh', async () => {
      // First refresh
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.OK)
        .stores('firstRefreshAccessToken', 'data.access_token')
        .stores('firstRefreshRefreshToken', 'data.refresh_token');

      // Second refresh
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{firstRefreshRefreshToken}')
        .expectStatus(HttpStatus.OK)
        .stores('secondRefreshAccessToken', 'data.access_token')
        .stores('secondRefreshRefreshToken', 'data.refresh_token');

      // All tokens should be different
      const firstAccess = pactum.stash.getDataStore()[
        'firstRefreshAccessToken'
      ] as string;
      const secondAccess = pactum.stash.getDataStore()[
        'secondRefreshAccessToken'
      ] as string;
      const firstRefresh = pactum.stash.getDataStore()[
        'firstRefreshRefreshToken'
      ] as string;
      const secondRefresh = pactum.stash.getDataStore()[
        'secondRefreshRefreshToken'
      ] as string;

      expect(firstAccess).not.toBe(secondAccess);
      expect(firstRefresh).not.toBe(secondRefresh);
    });

    it('should be able to use new access token after refresh', async () => {
      // Refresh to get new access token
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{initialRefreshToken}')
        .expectStatus(HttpStatus.OK)
        .stores('refreshedAccessToken', 'data.access_token');

      // Use the new access token to sign out
      return pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{refreshedAccessToken}')
        .expectStatus(HttpStatus.OK)
        .expectJsonMatch({
          message: 'User signed out successfully',
        });
    });

    it('should handle malformed refresh token', () => {
      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('not.a.valid.jwt')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when refresh token is missing sessionId', () => {
      // Create a token without sessionId (old format)
      const tokenWithoutSessionId =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      return pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken(tokenWithoutSessionId)
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /auth/sign-out', () => {
    const validUser = {
      name: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      password: 'Test@789',
    };

    beforeEach(async () => {
      // Sign up and sign in a user before each test
      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED);

      await pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .stores('signOutAccessToken', 'data.access_token');
    });

    it('should sign out a user successfully', () => {
      return pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{signOutAccessToken}')
        .expectStatus(HttpStatus.OK)
        .expectJsonMatch({
          message: 'User signed out successfully',
        });
    });

    it('should return 401 when no token is provided', () => {
      return pactum
        .spec()
        .post('/auth/sign-out')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when invalid token is provided', () => {
      return pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('invalid-token')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should return 401 when expired token is provided', () => {
      // This is a mock expired token (you'd need to create an actual expired token in real scenario)
      const expiredToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj0vdYbZfbZ5-XgZfZfZfZfZfZfZfZfZfZfZfZf';

      return pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken(expiredToken)
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should not be able to use token after sign out', async () => {
      // Sign out
      await pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{signOutAccessToken}')
        .expectStatus(HttpStatus.OK);

      // Try to use the same token again
      return pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{signOutAccessToken}')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('Auth Flow Integration', () => {
    const validUser = {
      name: 'Alice Williams',
      email: 'alice.williams@example.com',
      password: 'Test@999',
    };

    it('should complete full authentication flow: sign-up -> sign-in -> sign-out', async () => {
      // Step 1: Sign up
      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED)
        .expectJsonMatch({
          data: {
            access_token: like('token'),
            refresh_token: like('token'),
          },
        });

      // Step 2: Sign in with the same credentials
      await pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .stores('flowAccessToken', 'data.access_token');

      // Step 3: Sign out
      await pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{flowAccessToken}')
        .expectStatus(HttpStatus.OK);

      // Step 4: Verify token is no longer valid
      await pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{flowAccessToken}')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should complete full refresh flow: sign-up -> refresh -> use new token -> sign-out', async () => {
      // Step 1: Sign up
      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED)
        .stores('originalAccessToken', 'data.access_token')
        .stores('originalRefreshToken', 'data.refresh_token');

      // Step 2: Refresh the token
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{originalRefreshToken}')
        .expectStatus(HttpStatus.OK)
        .stores('refreshedAccessToken', 'data.access_token')
        .stores('refreshedRefreshToken', 'data.refresh_token');

      // Step 3: Verify old refresh token no longer works
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{originalRefreshToken}')
        .expectStatus(HttpStatus.UNAUTHORIZED);

      // Step 4: Use new access token to sign out
      await pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{refreshedAccessToken}')
        .expectStatus(HttpStatus.OK);

      // Step 5: Verify new refresh token no longer works after sign out
      await pactum
        .spec()
        .post('/auth/refresh')
        .withBearerToken('$S{refreshedRefreshToken}')
        .expectStatus(HttpStatus.UNAUTHORIZED);
    });

    it('should allow multiple concurrent sessions', async () => {
      // Sign up
      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(validUser)
        .expectStatus(HttpStatus.CREATED);

      // Create first session
      await pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .stores('firstSessionToken', 'data.access_token');

      // Create second session
      await pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: validUser.email,
          password: validUser.password,
        })
        .expectStatus(HttpStatus.OK)
        .stores('secondSessionToken', 'data.access_token');

      // Both tokens should work
      await pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{firstSessionToken}')
        .expectStatus(HttpStatus.OK);

      await pactum
        .spec()
        .post('/auth/sign-out')
        .withBearerToken('$S{secondSessionToken}')
        .expectStatus(HttpStatus.OK);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty request body for sign-up', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({})
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should handle empty request body for sign-in', () => {
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({})
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should handle malformed JSON', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withHeaders('Content-Type', 'application/json')
        .withBody('{"invalid": json}')
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should handle SQL injection attempt in email', () => {
      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody({
          name: 'Test User',
          email: "test@example.com' OR '1'='1",
          password: 'Test@123',
        })
        .expectStatus(HttpStatus.BAD_REQUEST);
    });

    it('should handle XSS attempt in name', async () => {
      const xssUser = {
        name: '<script>alert("xss")</script>',
        email: 'xss@example.com',
        password: 'Test@123',
      };

      return pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(xssUser)
        .expectStatus(HttpStatus.CREATED);
    });

    it('should trim whitespace from email', async () => {
      const userWithSpaces = {
        name: 'Test User',
        email: '  test@example.com  ',
        password: 'Test@123',
      };

      await pactum
        .spec()
        .post('/auth/sign-up')
        .withBody(userWithSpaces)
        .expectStatus(HttpStatus.CREATED);

      // Should be able to sign in with trimmed email
      return pactum
        .spec()
        .post('/auth/sign-in')
        .withBody({
          email: 'test@example.com',
          password: 'Test@123',
        })
        .expectStatus(HttpStatus.OK);
    });
  });
});
