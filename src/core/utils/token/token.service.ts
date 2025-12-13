import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { Environment } from '../../config/environment';
import {
  LicensePayload,
  RefreshTokenPayload,
  TokenPayload,
  TokenResponse,
} from './types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(
      {
        ...payload,
        jti: this.generateJti(),
      },
      {
        secret: this.config.getOrThrow(Environment.JWT_ACCESS_SECRET),
        expiresIn: this.getAccessTokenExpiresIn(),
      },
    );
  }

  async generateRefreshToken(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(
      {
        ...payload,
        jti: this.generateJti(),
      },
      {
        secret: this.config.getOrThrow(Environment.JWT_REFRESH_SECRET),
        expiresIn: this.getRefreshTokenExpiresIn(),
      },
    );
  }

  getAccessTokenExpiresIn(): number {
    return Number(
      this.config.getOrThrow<number>(Environment.JWT_ACCESS_EXPIRES_IN),
    );
  }

  getRefreshTokenExpiresIn(): number {
    return Number(
      this.config.getOrThrow<number>(Environment.JWT_REFRESH_EXPIRES_IN),
    );
  }

  async generateTokens(payload: TokenPayload): Promise<TokenResponse> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(
        {
          ...payload,
          jti: this.generateJti(),
        },
        {
          secret: this.config.getOrThrow(Environment.JWT_ACCESS_SECRET),
          expiresIn: this.getAccessTokenExpiresIn(),
        },
      ),
      this.jwtService.signAsync(
        {
          ...payload,
          jti: this.generateJti(),
        },
        {
          secret: this.config.getOrThrow(Environment.JWT_REFRESH_SECRET),
          expiresIn: this.config.getOrThrow<number>(
            Environment.JWT_REFRESH_EXPIRES_IN,
          ),
        },
      ),
    ]);
    return {
      access_token,
      refresh_token,
      expires_in: this.getAccessTokenExpiresIn(),
    };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow(Environment.JWT_ACCESS_SECRET),
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow(Environment.JWT_REFRESH_SECRET),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async generateLicenseToken(
    payload: LicensePayload,
    privateKey: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        ...payload,
        jti: this.generateJti(),
      },
      {
        secret: privateKey,
        algorithm: 'RS256',
      },
    );
  }

  generateJti(): string {
    return crypto.randomUUID();
  }

  generateCode(length: number = 15): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
