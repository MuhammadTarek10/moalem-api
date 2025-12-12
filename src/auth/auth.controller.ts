import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ResponseDto } from 'src/core/common/dtos/response.dto';
import { GetUser } from 'src/core/decorators/get-user.decorator';
import { ResponseMessage } from 'src/core/decorators/response-message.decorator';
import { CookieService } from 'src/core/utils/cookie/cookie.service';
import { TokenService } from 'src/core/utils/token/token.service';
import type {
  RefreshTokenPayload,
  UserWithSession,
} from 'src/core/utils/token/types';
import { User } from 'src/users/schemas/user.schema';
import { AuthService } from './auth.service';
import { SignInDto } from './dtos/sign-in.dto';
import { SignUpDto } from './dtos/sign-up.dto';
import { TokenResponseDto } from './dtos/token-response.dto';
import { JwtGuard } from './guards/jwt.guard';
import { LocalGuard } from './guards/local.guard';
import { RefreshGuard } from './guards/refresh.guard';

@ApiTags('Authentication')
@ApiExtraModels(ResponseDto, TokenResponseDto)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly tokenService: TokenService,
  ) {}

  @ApiOperation({
    summary: 'Sign up a new user',
    description:
      'Creates a new user account and returns tokens in both response body and HTTP-only cookies',
  })
  @ApiBody({ type: SignUpDto })
  @ApiCreatedResponse({
    description:
      'User signed up successfully. Tokens are returned in response and set as HTTP-only cookies',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenResponseDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad request',
    schema: {
      allOf: [{ $ref: getSchemaPath(ResponseDto) }],
    },
  })
  @ResponseMessage('User signed up successfully')
  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signUp(dto);

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      this.tokenService.getRefreshTokenExpiresIn(),
    );

    return tokens;
  }

  @ApiOperation({
    summary: 'Sign in a user',
    description:
      'Authenticates a user and returns tokens in both response body and HTTP-only cookies',
  })
  @ApiBody({ type: SignInDto })
  @ApiOkResponse({
    description:
      'User signed in successfully. Tokens are returned in response and set as HTTP-only cookies',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenResponseDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: 'Bad request',
    schema: {
      allOf: [{ $ref: getSchemaPath(ResponseDto) }],
    },
  })
  @UseGuards(LocalGuard)
  @ResponseMessage('User signed in successfully')
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(
    @GetUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signIn(user);

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      this.tokenService.getRefreshTokenExpiresIn(),
    );

    return tokens;
  }

  @ApiOperation({
    summary: "Refresh a user's token",
    description:
      'Use Bearer token or HTTP-only cookie (refresh_token) for authentication',
  })
  @ApiBearerAuth()
  @ApiCookieAuth('refresh_token')
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseDto) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenResponseDto) },
          },
        },
      ],
    },
  })
  @UseGuards(RefreshGuard)
  @ResponseMessage('Token refreshed successfully')
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @GetUser() payload: RefreshTokenPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refresh(payload);

    this.cookieService.setAuthCookies(
      res,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      this.tokenService.getRefreshTokenExpiresIn(),
    );

    return tokens;
  }

  @ApiOperation({
    summary: 'Sign out a user',
    description:
      'Use Bearer token or HTTP-only cookie (access_token) for authentication. Clears all authentication cookies',
  })
  @ApiOkResponse({ description: 'User signed out successfully' })
  @ApiBadRequestResponse({
    description: 'Bad request',
    schema: {
      allOf: [{ $ref: getSchemaPath(ResponseDto) }],
    },
  })
  @ResponseMessage('User signed out successfully')
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  @Post('sign-out')
  async signOut(
    @GetUser() user: UserWithSession,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.signOut(user);

    this.cookieService.clearAuthCookies(res);
  }
}
