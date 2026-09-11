import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed.jwt.token') } },
        {
          provide: getRepositoryToken(User),
          useValue: { findOneBy: jest.fn(), create: jest.fn((x) => x), save: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
  });

  describe('register', () => {
    it('rechaza un email que ya existe', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: '1' } as User);
      await expect(service.register('a@a.com', 'password123')).rejects.toThrow(ConflictException);
    });

    it('hashea la contraseña antes de guardar', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => ({ id: '1', ...u }) as User);

      await service.register('a@a.com', 'password123');

      const saved = userRepo.save.mock.calls[0][0] as User;
      expect(saved.passwordHash).not.toBe('password123');
      expect(await bcrypt.compare('password123', saved.passwordHash)).toBe(true);
    });

    it('devuelve un accessToken', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      userRepo.save.mockImplementation(async (u) => ({ id: '1', ...u }) as User);

      const result = await service.register('a@a.com', 'password123');
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
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

    it('acepta la contraseña correcta', async () => {
      const passwordHash = await bcrypt.hash('correcta', 10);
      userRepo.findOneBy.mockResolvedValue({ id: '1', email: 'a@a.com', passwordHash } as User);
      const result = await service.login('a@a.com', 'correcta');
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });
  });
});
