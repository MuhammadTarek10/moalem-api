import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CookieService } from './cookie/cookie.service';
import { HashService } from './hash.service';
import { TokenService } from './token/token.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [HashService, TokenService, CookieService],
  exports: [HashService, TokenService, CookieService],
})
export class UtilsModule {}
