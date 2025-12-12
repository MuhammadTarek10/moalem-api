import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { Environment } from 'src/core/config/environment';

@Injectable()
export class CookieService {
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.isProduction = this.config.get(Environment.NODE_ENV) === 'production';
  }

  setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    accessTokenExpiresIn: number,
    refreshTokenExpiresIn: number,
  ): void {
    const cookieOptions = this.getCookieOptions();

    // Set access token cookie
    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: accessTokenExpiresIn * 1000,
    });

    // Set refresh token cookie
    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: refreshTokenExpiresIn * 1000,
    });
  }

  clearAuthCookies(res: Response): void {
    const cookieOptions = this.getCookieOptions();

    res.cookie('access_token', '', {
      ...cookieOptions,
      maxAge: 0,
    });

    res.cookie('refresh_token', '', {
      ...cookieOptions,
      maxAge: 0,
    });
  }

  /**
   * Get cookie options based on environment
   * @returns Cookie options object
   */
  private getCookieOptions() {
    return {
      httpOnly: true, // Prevents JavaScript access to cookies
      sameSite: 'lax' as const, // CSRF protection while allowing some cross-site requests
      secure: this.isProduction, // Only send cookie over HTTPS in production
      path: '/', // Cookie available for all routes
    };
  }
}
