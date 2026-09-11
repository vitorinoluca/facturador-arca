import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') } },
        {
          provide: getRepositoryToken(User),
          useValue: { findOneBy: jest.fn(), create: jest.fn((x) => x), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: { findOneBy: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
  });

  describe('register', () => {
    it('rechaza un email que ya existe', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: '1' } as User);
      await expect(service.register('a@a.com', 'password123')).rejects.toThrow(ConflictException);
    });

    it('hashea la contraseña antes de guardar', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => ({ id: '1', ...u }) as User);
      refreshTokenRepo.save.mockImplementation(async (t) => t as RefreshToken);

      await service.register('a@a.com', 'password123');

      const saved = userRepo.save.mock.calls[0][0] as User;
      expect(saved.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', saved.passwordHash)).toBe(true);
    });

    it('devuelve un access token y un refresh token, y guarda solo el hash del refresh', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => ({ id: '1', ...u }) as User);
      refreshTokenRepo.save.mockImplementation(async (t) => t as RefreshToken);

      const result = await service.register('a@a.com', 'password123');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toHaveLength(64); // 32 bytes en hex
      const savedRefresh = refreshTokenRepo.save.mock.calls[0][0] as RefreshToken;
      expect(savedRefresh.tokenHash).not.toBe(result.refreshToken);
    });
  });

  describe('login', () => {
    it('rechaza un email inexistente', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      await expect(service.login('nadie@a.com', 'x')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza una contraseña incorrecta', async () => {
      const passwordHash = await bcrypt.hash('correcta', 10);
      userRepo.findOneBy.mockResolvedValue({ id: '1', email: 'a@a.com', passwordHash } as User);
      await expect(service.login('a@a.com', 'incorrecta')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rechaza un token que no existe', async () => {
      refreshTokenRepo.findOneBy.mockResolvedValue(null);
      await expect(service.refresh('inexistente')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza un token expirado', async () => {
      refreshTokenRepo.findOneBy.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000),
        revoked: false,
      } as RefreshToken);
      await expect(service.refresh('viejo')).rejects.toThrow(UnauthorizedException);
    });

    it('detecta reuso de un token ya rotado y revoca toda la sesión', async () => {
      refreshTokenRepo.findOneBy.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 1000 * 60),
        revoked: true,
      } as RefreshToken);

      await expect(service.refresh('reutilizado')).rejects.toThrow(UnauthorizedException);
      expect(refreshTokenRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { revoked: true });
    });

    it('rota: emite un par nuevo y marca el usado como revocado', async () => {
      refreshTokenRepo.findOneBy.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 1000 * 60),
        revoked: false,
      } as RefreshToken);
      userRepo.findOneBy.mockResolvedValue({ id: 'user-1', email: 'a@a.com' } as User);
      refreshTokenRepo.save.mockImplementation(async (t) => t as RefreshToken);

      const result = await service.refresh('valido');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith({ id: 'rt-1' }, { revoked: true });
      expect(result.accessToken).toBe('signed.jwt.token');
    });
  });
});
