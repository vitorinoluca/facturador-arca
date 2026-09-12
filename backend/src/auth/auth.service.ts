import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { GoogleProfile } from './google-oauth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { VerificationToken, VerificationTokenPurpose } from './entities/verification-token.entity';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hora — es más sensible, vence antes

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// FRONTEND_URL puede traer varios orígenes separados por coma (ver main.ts, CORS)
// — para armar un link de verdad hace falta uno solo, siempre el primero.
function frontendOrigin(): string {
  return (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0].trim();
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(VerificationToken) private readonly verificationTokenRepo: Repository<VerificationToken>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      throw new ConflictException('ya existe una cuenta con ese email');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.save(this.userRepo.create({ email, passwordHash }));
    await this.sendVerificationEmail(user.id, user.email);
    return this.issueTokenPair(user.id, user.email);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('credenciales inválidas');
    }
    return this.issueTokenPair(user.id, user.email);
  }

  // Cuentas de Google se buscan por googleId (estable) y, si no existe todavía,
  // se linkean por email a una cuenta con contraseña ya creada — así alguien que
  // se registró con email/contraseña puede después entrar con Google sin
  // terminar con dos cuentas separadas.
  async loginWithGoogle(profile: GoogleProfile): Promise<TokenPair> {
    let user = await this.userRepo.findOneBy({ googleId: profile.googleId });
    if (!user) {
      user = await this.userRepo.findOneBy({ email: profile.email });
      if (user) {
        user.googleId = profile.googleId;
      } else {
        user = this.userRepo.create({ email: profile.email, googleId: profile.googleId });
      }
      if (profile.emailVerified) {
        user.emailVerified = true;
      }
      user = await this.userRepo.save(user);
    }
    return this.issueTokenPair(user.id, user.email);
  }

  // Rotación: cada refresh token solo sirve una vez. Si alguien reintenta usar uno
  // ya usado (señal de que fue robado y el legítimo ya lo rotó, o viceversa), se
  // revocan todos los refresh tokens del usuario y se corta la sesión por completo.
  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(rawToken);
    const stored = await this.refreshTokenRepo.findOneBy({ tokenHash });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('sesión expirada, iniciá sesión de nuevo');
    }
    if (stored.revoked) {
      await this.refreshTokenRepo.update({ userId: stored.userId }, { revoked: true });
      throw new UnauthorizedException('token reutilizado — la sesión fue cerrada por seguridad');
    }

    await this.refreshTokenRepo.update({ id: stored.id }, { revoked: true });

    const user = await this.userRepo.findOneBy({ id: stored.userId });
    if (!user) {
      throw new UnauthorizedException('usuario no encontrado');
    }
    return this.issueTokenPair(user.id, user.email);
  }

  async logout(rawToken: string): Promise<void> {
    await this.refreshTokenRepo.update({ tokenHash: hashToken(rawToken) }, { revoked: true });
  }

  async getProfile(userId: string): Promise<{ id: string; email: string; emailVerified: boolean }> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('usuario no encontrado');
    }
    return { id: user.id, email: user.email, emailVerified: user.emailVerified };
  }

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const rawToken = await this.createVerificationToken(userId, VerificationTokenPurpose.EMAIL_VERIFY, EMAIL_VERIFY_TTL_MS);
    const link = `${frontendOrigin()}/verify-email?token=${rawToken}`;
    await this.mailService.send(
      email,
      'Confirmá tu email — Facturador ARCA',
      `<p>Confirmá tu cuenta haciendo click acá:</p><p><a href="${link}">${link}</a></p><p>El link vence en 24 horas.</p>`,
    );
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user || user.emailVerified) return; // no filtramos si ya está verificado — silencioso
    await this.sendVerificationEmail(user.id, user.email);
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const userId = await this.consumeToken(rawToken, VerificationTokenPurpose.EMAIL_VERIFY);
    await this.userRepo.update({ id: userId }, { emailVerified: true });
  }

  // Siempre resuelve igual exista o no el mail — no hay que dejarle a un atacante
  // usar este endpoint para enumerar qué emails están registrados.
  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) return;
    const rawToken = await this.createVerificationToken(user.id, VerificationTokenPurpose.PASSWORD_RESET, PASSWORD_RESET_TTL_MS);
    const link = `${frontendOrigin()}/reset-password?token=${rawToken}`;
    await this.mailService.send(
      email,
      'Recuperar contraseña — Facturador ARCA',
      `<p>Elegí una contraseña nueva acá:</p><p><a href="${link}">${link}</a></p><p>El link vence en 1 hora. Si no pediste esto, ignorá el mail.</p>`,
    );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const userId = await this.consumeToken(rawToken, VerificationTokenPurpose.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update({ id: userId }, { passwordHash });
    // cerrar todas las sesiones activas — si alguien más tenía una sesión abierta
    // (ej. robaron la cuenta antes), un reset de contraseña la corta también.
    await this.refreshTokenRepo.update({ userId }, { revoked: true });
  }

  private async createVerificationToken(
    userId: string,
    purpose: VerificationTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    await this.verificationTokenRepo.save(
      this.verificationTokenRepo.create({
        userId,
        purpose,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttlMs),
      }),
    );
    return rawToken;
  }

  private async consumeToken(rawToken: string, purpose: VerificationTokenPurpose): Promise<string> {
    const stored = await this.verificationTokenRepo.findOneBy({ tokenHash: hashToken(rawToken), purpose });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('link inválido o vencido');
    }
    await this.verificationTokenRepo.update({ id: stored.id }, { usedAt: new Date() });
    return stored.userId;
  }

  private async issueTokenPair(userId: string, email: string): Promise<TokenPair> {
    const accessToken = this.jwtService.sign({ sub: userId, email }, { expiresIn: ACCESS_TOKEN_TTL });

    const refreshToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({ userId, tokenHash: hashToken(refreshToken), expiresAt }),
    );

    return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
  }
}
