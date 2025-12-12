import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Environment } from '../../core/config/environment';
import { TokenPayload, UserWithSession } from '../../core/utils/token/types';
import { UsersService } from '../../users/users.service';

const extractJwtFromCookie = (req: unknown): string | null => {
  const request = req as Request & { cookies?: Record<string, string> };
  if (request?.cookies?.access_token) {
    return request.cookies.access_token;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractJwtFromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.getOrThrow(Environment.JWT_ACCESS_SECRET),
    });
  }

  async validate(payload: TokenPayload): Promise<UserWithSession> {
    const user = await this.usersService.findById(payload.id);
    if (user) {
      return {
        ...user.toObject(),
        sessionId: payload.sessionId,
      } as UserWithSession;
    }

    throw new UnauthorizedException(
      'You are not authorized to access this resource',
    );
  }
}
