import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      throw new ConflictException('ya existe una cuenta con ese email');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepo.save(this.userRepo.create({ email, passwordHash }));
    return this.issueTokenPair(user.id, user.email);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('credenciales inválidas');
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
