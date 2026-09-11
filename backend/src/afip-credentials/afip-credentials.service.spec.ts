import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AfipCredentialsService } from './afip-credentials.service';
import { CreateAfipCredentialDto } from './dto/create-afip-credential.dto';
import { AfipCredential } from './entities/afip-credential.entity';

const dto: CreateAfipCredentialDto = {
  cuit: '20460137749',
  cert: '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
  key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----',
  businessName: 'Luca Vitorino',
  address: 'Calle 123, La Plata',
  activityStartDate: '2020-01-01',
};

describe('AfipCredentialsService', () => {
  let service: AfipCredentialsService;
  let repo: jest.Mocked<Repository<AfipCredential>>;

  beforeEach(async () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'a'.repeat(64);

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
      ],
    }).compile();

    service = module.get(AfipCredentialsService);
    repo = module.get(getRepositoryToken(AfipCredential));
  });

  describe('create', () => {
    it('rechaza si el usuario ya tiene una credencial', async () => {
      repo.findOneBy.mockResolvedValue({ id: 'existing' } as AfipCredential);
      await expect(service.create('user-1', dto)).rejects.toThrow(ConflictException);
    });

    it('nunca guarda el cert/key en texto plano', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockImplementation(async (c) => ({ id: 'new', ...c }) as AfipCredential);

      await service.create('user-1', dto);

      const saved = repo.save.mock.calls[0][0] as AfipCredential;
      expect(saved.certEncrypted).not.toContain('BEGIN CERTIFICATE');
      expect(saved.keyEncrypted).not.toContain('BEGIN PRIVATE KEY');
    });

    it('usa "Exento" como default de Ingresos Brutos si no se manda', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockImplementation(async (c) => ({ id: 'new', ...c }) as AfipCredential);

      await service.create('user-1', dto);

      const saved = repo.save.mock.calls[0][0] as AfipCredential;
      expect(saved.grossIncome).toBe('Exento');
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

  describe('getDecrypted', () => {
    it('devuelve null si no existe', async () => {
      repo.findOneBy.mockResolvedValue(null);
      expect(await service.getDecrypted('user-1', 'cred-1')).toBeNull();
    });

    it('desencripta cert y key correctamente', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockImplementation(async (c) => ({ id: 'new', ...c }) as AfipCredential);
      const created = await service.create('user-1', dto);

      const savedRow = repo.save.mock.calls[0][0] as AfipCredential;
      repo.findOneBy.mockResolvedValue({ ...savedRow, id: created.id } as AfipCredential);

      const decrypted = await service.getDecrypted('user-1', created.id);
      expect(decrypted?.cert).toBe(dto.cert);
      expect(decrypted?.key).toBe(dto.key);
    });
  });
});
