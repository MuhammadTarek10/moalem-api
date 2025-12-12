import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HashService } from 'src/core/utils/hash.service';
import { TokenService } from 'src/core/utils/token/token.service';
import {
  RefreshTokenPayload,
  TokenResponse,
  UserWithSession,
} from 'src/core/utils/token/types';
import { User } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import { SignUpDto } from './dtos/sign-up.dto';
import { SessionRepository } from './session.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly hashService: HashService,
  ) { }

  async signUp(dto: SignUpDto): Promise<TokenResponse> {
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await this.hashService.hash(dto.password);

    const user = await this.usersService.create({
      ...dto,
      authMethod: { provider: 'local', passwordHash: hashedPassword },
    });

    const userId = user._id.toString();

    const session = await this.sessionRepository.create({
      userId: user._id,
      refreshTokenHash: 'placeholder',
      expiresAt: this.getExpiresAt('refresh'),
    });

    const sessionId = session._id.toString();

    // Generate tokens with sessionId
    const refreshToken = await this.tokenService.generateRefreshToken({
      id: userId,
      email: user.email,
      sessionId,
    });
    const refreshTokenHash = await this.hashService.hash(refreshToken);

    // Update session with actual refresh token hash
    await this.sessionRepository.update(sessionId, {
      refreshTokenHash,
    });

    const accessToken = await this.tokenService.generateAccessToken({
      id: userId,
      email: user.email,
      sessionId,
    });

    const accessTokenExpiresIn = this.tokenService.getAccessTokenExpiresIn();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiresIn,
    };
  }

  async signIn(user: User): Promise<TokenResponse> {
    const userId = user._id.toString();

    const session = await this.sessionRepository.create({
      userId: user._id,
      refreshTokenHash: 'placeholder',
      expiresAt: this.getExpiresAt('refresh'),
    });

    const sessionId = session._id.toString();

    const refreshToken = await this.tokenService.generateRefreshToken({
      id: userId,
      email: user.email,
      sessionId,
    });
    const refreshTokenHash = await this.hashService.hash(refreshToken);

    await this.sessionRepository.update(sessionId, {
      refreshTokenHash,
    });

    const accessToken = await this.tokenService.generateAccessToken({
      id: userId,
      email: user.email,
      sessionId,
    });

    const accessTokenExpiresIn = this.tokenService.getAccessTokenExpiresIn();

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: accessTokenExpiresIn,
    };
  }

  async refresh(payload: RefreshTokenPayload): Promise<TokenResponse> {
    const { id, sessionId, refreshToken, email } = payload;

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    const isValid = await this.hashService.verify(
      refreshToken,
      session.refreshTokenHash,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { access_token, refresh_token } =
      await this.tokenService.generateTokens({
        id,
        email,
        sessionId,
      });
    const newRefreshTokenHash = await this.hashService.hash(refresh_token);

    await this.sessionRepository.update(sessionId, {
      refreshTokenHash: newRefreshTokenHash,
      expiresAt: this.getExpiresAt('refresh'),
    });

    const expiresIn = this.tokenService.getAccessTokenExpiresIn();

    return {
      access_token: access_token,
      refresh_token: refresh_token,
      expires_in: expiresIn,
    };
  }

  async signOut(user: UserWithSession): Promise<void> {
    const session = await this.sessionRepository.findById(user.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.sessionRepository.deleteSession(user.sessionId);
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findWithPassword(email);
    if (!user || !user.authMethods[0].passwordHash) {
      return null;
    }

    const isPasswordValid = await this.hashService.verify(
      password,
      user.authMethods[0].passwordHash,
    );
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private getExpiresAt(type: 'access' | 'refresh'): Date {
    const now = new Date();
    const expiresIn = Number(
      type === 'access'
        ? this.tokenService.getAccessTokenExpiresIn()
        : this.tokenService.getRefreshTokenExpiresIn(),
    );
    return new Date(now.getTime() + expiresIn * 1000);
  }
}
