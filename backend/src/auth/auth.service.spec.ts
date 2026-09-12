import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { VerificationToken, VerificationTokenPurpose } from './entities/verification-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>;
  let verificationTokenRepo: jest.Mocked<Repository<VerificationToken>>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') } },
        { provide: MailService, useValue: { send: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: getRepositoryToken(User),
          useValue: { findOneBy: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), update: jest.fn() },
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: { findOneBy: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), update: jest.fn() },
        },
        {
          provide: getRepositoryToken(VerificationToken),
          useValue: { findOneBy: jest.fn(), create: jest.fn((x) => x), save: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    verificationTokenRepo = module.get(getRepositoryToken(VerificationToken));
    mailService = module.get(MailService);
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
      verificationTokenRepo.save.mockImplementation(async (t) => t as VerificationToken);

      await service.register('a@a.com', 'password123');

      const saved = userRepo.save.mock.calls[0][0] as User;
      expect(saved.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', saved.passwordHash!)).toBe(true);
    });

    it('devuelve un access token y un refresh token, y guarda solo el hash del refresh', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => ({ id: '1', ...u }) as User);
      refreshTokenRepo.save.mockImplementation(async (t) => t as RefreshToken);
      verificationTokenRepo.save.mockImplementation(async (t) => t as VerificationToken);

      const result = await service.register('a@a.com', 'password123');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.refreshToken).toHaveLength(64); // 32 bytes en hex
      const savedRefresh = refreshTokenRepo.save.mock.calls[0][0] as RefreshToken;
      expect(savedRefresh.tokenHash).not.toBe(result.refreshToken);
    });

    it('manda el mail de verificación al registrarse', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => ({ id: '1', ...u }) as User);
      refreshTokenRepo.save.mockImplementation(async (t) => t as RefreshToken);
      verificationTokenRepo.save.mockImplementation(async (t) => t as VerificationToken);

      await service.register('a@a.com', 'password123');

      expect(mailService.send).toHaveBeenCalledWith('a@a.com', expect.stringContaining('Confirmá'), expect.any(String), expect.any(String));
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

    it('rechaza una cuenta de solo-Google (sin contraseña)', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: '1', email: 'a@a.com', passwordHash: undefined } as User);
      await expect(service.login('a@a.com', 'lo-que-sea')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('loginWithGoogle', () => {
    it('crea una cuenta nueva si no existe ni por googleId ni por email', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => ({ id: '1', emailVerified: false, ...u }) as User);
      refreshTokenRepo.save.mockImplementation(async (t) => t as RefreshToken);

      await service.loginWithGoogle({ googleId: 'g-1', email: 'nueva@a.com', emailVerified: true });

      const saved = userRepo.save.mock.calls[0][0] as User;
      expect(saved.googleId).toBe('g-1');
      expect(saved.emailVerified).toBe(true);
    });

    it('linkea el googleId a una cuenta existente con el mismo email', async () => {
      userRepo.findOneBy
        .mockResolvedValueOnce(null) // no existe por googleId
        .mockResolvedValueOnce({ id: '1', email: 'existente@a.com', emailVerified: false } as User);
      userRepo.save.mockImplementation(async (u) => u as User);
      refreshTokenRepo.save.mockImplementation(async (t) => t as RefreshToken);

      await service.loginWithGoogle({ googleId: 'g-2', email: 'existente@a.com', emailVerified: true });

      const saved = userRepo.save.mock.calls[0][0] as User;
      expect(saved.googleId).toBe('g-2');
      expect(saved.id).toBe('1');
    });
  });

  describe('forgotPassword', () => {
    it('no manda mail si el email no existe (evita enumeración)', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      await service.forgotPassword('nadie@a.com');
      expect(mailService.send).not.toHaveBeenCalled();
    });

    it('manda el link de reset si el usuario existe', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: '1', email: 'a@a.com' } as User);
      verificationTokenRepo.save.mockImplementation(async (t) => t as VerificationToken);

      await service.forgotPassword('a@a.com');

      expect(mailService.send).toHaveBeenCalledWith('a@a.com', expect.stringContaining('Recuperar'), expect.any(String), expect.any(String));
    });
  });

  describe('resetPassword', () => {
    it('rechaza un token vencido', async () => {
      verificationTokenRepo.findOneBy.mockResolvedValue({
        id: 'vt-1',
        userId: 'user-1',
        purpose: VerificationTokenPurpose.PASSWORD_RESET,
        expiresAt: new Date(Date.now() - 1000),
      } as VerificationToken);

      await expect(service.resetPassword('viejo', 'nuevaPass123')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza un token ya usado', async () => {
      verificationTokenRepo.findOneBy.mockResolvedValue({
        id: 'vt-1',
        userId: 'user-1',
        purpose: VerificationTokenPurpose.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      } as VerificationToken);

      await expect(service.resetPassword('reusado', 'nuevaPass123')).rejects.toThrow(UnauthorizedException);
    });

    it('actualiza la contraseña y revoca todas las sesiones activas', async () => {
      verificationTokenRepo.findOneBy.mockResolvedValue({
        id: 'vt-1',
        userId: 'user-1',
        purpose: VerificationTokenPurpose.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 60_000),
      } as VerificationToken);

      await service.resetPassword('valido', 'nuevaPass123');

      expect(verificationTokenRepo.update).toHaveBeenCalledWith({ id: 'vt-1' }, { usedAt: expect.any(Date) });
      expect(userRepo.update).toHaveBeenCalledWith({ id: 'user-1' }, { passwordHash: expect.any(String) });
      expect(refreshTokenRepo.update).toHaveBeenCalledWith({ userId: 'user-1' }, { revoked: true });
    });
  });

  describe('verifyEmail', () => {
    it('marca emailVerified en true con un token válido', async () => {
      verificationTokenRepo.findOneBy.mockResolvedValue({
        id: 'vt-1',
        userId: 'user-1',
        purpose: VerificationTokenPurpose.EMAIL_VERIFY,
        expiresAt: new Date(Date.now() + 60_000),
      } as VerificationToken);

      await service.verifyEmail('valido');

      expect(userRepo.update).toHaveBeenCalledWith({ id: 'user-1' }, { emailVerified: true });
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
