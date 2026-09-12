import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { AfipCredentialsService } from './afip-credentials.service';
import { CreateAfipCredentialDto } from './dto/create-afip-credential.dto';
import { AfipCredential } from './entities/afip-credential.entity';

const dto: CreateAfipCredentialDto = {
  cuit: '20460137749',
  businessName: 'Luca Vitorino',
  address: 'Calle 123, La Plata',
  activityStartDate: '2020-01-01',
};

describe('AfipCredentialsService', () => {
  let service: AfipCredentialsService;
  let repo: jest.Mocked<Repository<AfipCredential>>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AfipCredentialsService,
        {
          provide: getRepositoryToken(AfipCredential),
          useValue: {
            findOneBy: jest.fn(),
            find: jest.fn(),
            create: jest.fn((x) => x),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: { getProfile: jest.fn().mockResolvedValue({ id: 'user-1', email: 'a@a.com', emailVerified: true }) },
        },
      ],
    }).compile();

    service = module.get(AfipCredentialsService);
    repo = module.get(getRepositoryToken(AfipCredential));
    authService = module.get(AuthService);
  });

  describe('create', () => {
    it('rechaza si el email no está verificado', async () => {
      authService.getProfile.mockResolvedValue({ id: 'user-1', email: 'a@a.com', emailVerified: false });
      await expect(service.create('user-1', dto)).rejects.toThrow(ForbiddenException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rechaza si el usuario ya tiene una credencial', async () => {
      repo.findOneBy.mockResolvedValue({ id: 'existing' } as AfipCredential);
      await expect(service.create('user-1', dto)).rejects.toThrow(ConflictException);
    });

    it('usa "Exento" como default de Ingresos Brutos si no se manda', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockImplementation(async (c) => ({ id: 'new', ...c }) as AfipCredential);

      await service.create('user-1', dto);

      const saved = repo.save.mock.calls[0][0] as AfipCredential;
      expect(saved.grossIncome).toBe('Exento');
    });

    it('siempre crea la credencial en ambiente "production" (el ambiente se elige por factura)', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockImplementation(async (c) => ({ id: 'new', ...c }) as AfipCredential);

      await service.create('user-1', dto);

      const saved = repo.save.mock.calls[0][0] as AfipCredential;
      expect(saved.environment).toBe('production');
    });
  });

  describe('remove', () => {
    it('rechaza si no borró ninguna fila (no existe o no es del usuario)', async () => {
      repo.delete.mockResolvedValue({ affected: 0, raw: [] });
      await expect(service.remove('user-1', 'otra-cred')).rejects.toThrow(NotFoundException);
    });

    it('borra la credencial del usuario dueño', async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });
      await expect(service.remove('user-1', 'cred-1')).resolves.toEqual({ deleted: true });
      expect(repo.delete).toHaveBeenCalledWith({ id: 'cred-1', userId: 'user-1' });
    });
  });

  describe('get', () => {
    it('devuelve null si no existe', async () => {
      repo.findOneBy.mockResolvedValue(null);
      expect(await service.get('user-1', 'cred-1')).toBeNull();
    });

    it('solo devuelve credenciales del usuario dueño', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await service.get('user-1', 'cred-de-otro');
      expect(repo.findOneBy).toHaveBeenCalledWith({ id: 'cred-de-otro', userId: 'user-1' });
    });
  });
});
