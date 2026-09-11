import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService, TokenPair } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { AuthenticatedUser } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// login y register son los blancos típicos de fuerza bruta / credential stuffing:
// límite más estricto que el default global de la app
const BRUTE_FORCE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

const isProd = process.env.NODE_ENV === 'production';
// en producción front y back viven en dominios distintos (cross-site) → hace falta
// SameSite=None + Secure; en local, mismo "site" (localhost:*) alcanza con Lax.
const cookieBase = { httpOnly: true, secure: isProd, sameSite: isProd ? ('none' as const) : ('lax' as const) };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    this.setTokenCookies(res, await this.authService.register(dto.email, dto.password));
  }

  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    this.setTokenCookies(res, await this.authService.login(dto.email, dto.password));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('falta el refresh token');
    }
    this.setTokenCookies(res, await this.authService.refresh(refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('access_token', cookieBase);
    res.clearCookie('refresh_token', cookieBase);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  private setTokenCookies(res: Response, tokens: TokenPair) {
    res.cookie('access_token', tokens.accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieBase,
      expires: tokens.refreshTokenExpiresAt,
    });
  }
}
