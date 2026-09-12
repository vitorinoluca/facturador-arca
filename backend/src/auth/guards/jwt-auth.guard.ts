import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = (request.cookies as Record<string, string> | undefined)?.access_token;
    if (!token) {
      throw new UnauthorizedException('falta el token de autenticación');
    }
    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; email: string }>(token);
    } catch {
      throw new UnauthorizedException('token inválido o expirado');
    }
    // el JWT firmado sigue siendo válido hasta que expira aunque la cuenta ya no
    // exista (ej. si en el futuro se suma baja de cuenta) — se revalida contra la
    // base para cortar el acceso al toque en vez de esperar hasta 15 minutos.
    const exists = await this.userRepo.existsBy({ id: payload.sub });
    if (!exists) {
      throw new UnauthorizedException('usuario no encontrado');
    }
    (request as Request & { user: AuthenticatedUser }).user = { id: payload.sub, email: payload.email };
    return true;
  }
}
