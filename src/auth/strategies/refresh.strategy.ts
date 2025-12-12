import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Environment } from '../../core/config/environment';
import { RefreshTokenPayload } from '../../core/utils/token/types';
import { UsersService } from '../../users/users.service';

const extractJwtFromCookie = (req: unknown): string | null => {
  const request = req as Request & { cookies?: Record<string, string> };
  if (request?.cookies?.refresh_token) {
    return request.cookies.refresh_token;
  }
  return null;
};

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh',
) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.getOrThrow(Environment.JWT_REFRESH_SECRET),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: RefreshTokenPayload): RefreshTokenPayload {
    if (!payload.sessionId) {
      throw new UnauthorizedException('Session ID missing from token');
    }

    let refreshToken: string | undefined;

    const cookieStore = req as Request & { cookies?: Record<string, string> };
    refreshToken = cookieStore?.cookies?.refresh_token;

    if (refreshToken) return { ...payload, refreshToken };

    refreshToken = (
      req as Request & { headers?: { authorization?: string } }
    ).headers?.authorization?.split(' ')[1];
    if (!refreshToken) throw new UnauthorizedException('Invalid refresh token');

    return {
      ...payload,
      refreshToken,
    };
  }
}
