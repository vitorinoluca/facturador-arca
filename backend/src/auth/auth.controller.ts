import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthService, TokenPair } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { GoogleOAuthService } from './google-oauth.service';
import type { AuthenticatedUser } from './guards/jwt-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

// login/register/forgot-password son los blancos típicos de fuerza bruta /
// credential stuffing / enumeración: límite más estricto que el default global.
const BRUTE_FORCE_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

const isProd = process.env.NODE_ENV === 'production';
// en producción front y back viven en dominios distintos (cross-site) → hace falta
// SameSite=None + Secure; en local, mismo "site" (localhost:*) alcanza con Lax.
const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ('none' as const) : ('lax' as const),
};
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly googleOAuthService: GoogleOAuthService,
  ) {}

  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setTokenCookies(
      res,
      await this.authService.register(dto.email, dto.password),
    );
  }

  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setTokenCookies(
      res,
      await this.authService.login(dto.email, dto.password),
    );
  }

  // Paso 1 del login con Google: redirige al consent screen. state es un valor
  // random que se guarda en una cookie de corta vida y se vuelve a comparar en el
  // callback — protege contra CSRF en el flujo de OAuth (que alguien fuerce a la
  // víctima a completar un login que en realidad inició el atacante).
  @Get('google')
  googleRedirect(@Res() res: Response) {
    const state = randomBytes(16).toString('hex');
    res.cookie('google_oauth_state', state, {
      ...cookieBase,
      maxAge: 10 * 60 * 1000,
    });
    res.redirect(this.googleOAuthService.buildAuthUrl(state));
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const expectedState = (req.cookies as Record<string, string> | undefined)
      ?.google_oauth_state;
    res.clearCookie('google_oauth_state', cookieBase);
    if (!code || !state || !expectedState || state !== expectedState) {
      // el motivo típico: se reusó un link/vuelta de "atrás" del navegador después de
      // ya haber completado el login una vez — la cookie de state de esa vez ya se
      // borró (o venció, dura 10 min).
      this.logger.warn(
        `google callback con state inválido (code presente: ${!!code})`,
      );
      return res.redirect(`${frontendUrl}/login?error=google`);
    }
    try {
      const profile = await this.googleOAuthService.exchangeCode(code);
      const tokens = await this.authService.loginWithGoogle(profile);
      this.setTokenCookies(res, tokens);
      return res.redirect(`${frontendUrl}/dashboard`);
    } catch (err) {
      // sin este log no hay forma de saber por qué falló — Google rechazó el code
      // (reusado, vencido — dura ~10 min y es de un solo uso), redirect_uri mal
      // configurado, etc. El usuario solo ve "no se pudo", esto queda para debug.
      this.logger.error(`falló el login con Google: ${(err as Error).message}`);
      return res.redirect(`${frontendUrl}/login?error=google`);
    }
  }

  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // mismo mensaje exista o no la cuenta — no hay que dejar enumerar emails
    return {
      message:
        'si existe una cuenta con ese email, te mandamos un link para resetear la contraseña',
    };
  }

  @Throttle(BRUTE_FORCE_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    try {
      await this.authService.resetPassword(dto.token, dto.newPassword);
    } catch {
      throw new BadRequestException(
        'el link venció o ya se usó — pedí uno nuevo',
      );
    }
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    try {
      await this.authService.verifyEmail(dto.token);
    } catch {
      throw new BadRequestException('el link venció o ya se usó');
    }
  }

  @Throttle(BRUTE_FORCE_THROTTLE)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.resendVerification(user.id);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)
      ?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('falta el refresh token');
    }
    this.setTokenCookies(res, await this.authService.refresh(refreshToken));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = (req.cookies as Record<string, string> | undefined)
      ?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('access_token', cookieBase);
    res.clearCookie('refresh_token', cookieBase);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id);
  }

  private setTokenCookies(res: Response, tokens: TokenPair) {
    res.cookie('access_token', tokens.accessToken, {
      ...cookieBase,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieBase,
      expires: tokens.refreshTokenExpiresAt,
    });
  }
}
