import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { AfipCredentialsService } from '../afip-credentials/afip-credentials.service';
import { AfipClientService } from '../afip/afip-client.service';
import { AuthService } from '../auth/auth.service';
import { InvoicesService } from './invoices.service';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

// Fake mínimo del queryRunner de TypeORM: simula la misma tabla idempotency_keys
// que usa el código real (INSERT ... ON CONFLICT DO NOTHING) con un Map en memoria
// COMPARTIDO entre transacciones (como sería la tabla real en Postgres), así el
// test ejercita la lógica de idempotencia sin necesitar una base de verdad.
function createFakeDataSource() {
  const idempotencyStore = new Map<string, unknown>();
  let nextId = 1;

  const manager = {
    getRepository: () => ({
      findOneBy: async ({ key }: { key: string }) =>
        idempotencyStore.has(key)
          ? { key, responseBody: idempotencyStore.get(key) }
          : null,
      update: async (
        { key }: { key: string },
        { responseBody }: { responseBody: unknown },
      ) => {
        idempotencyStore.set(key, responseBody);
      },
    }),
    create: (_entity: unknown, data: Record<string, unknown>) => ({ ...data }),
    save: async (data: Record<string, unknown>) =>
      ({ id: `invoice-${nextId++}`, ...data }) as Invoice,
  };

  function createQueryRunner() {
    return {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      isTransactionActive: true,
      manager,
      query: jest.fn(async (_sql: string, [key]: [string]) => {
        if (idempotencyStore.has(key)) return [];
        idempotencyStore.set(key, null);
        return [{ key }];
      }),
    };
  }

  return { createQueryRunner: jest.fn(createQueryRunner) };
}

describe('InvoicesService', () => {
  let service: InvoicesService;
  let afipClient: jest.Mocked<AfipClientService>;
  let credentialsService: jest.Mocked<AfipCredentialsService>;
  let authService: jest.Mocked<AuthService>;
  let dataSource: { createQueryRunner: jest.Mock };

  const fakeCredential = {
    cuit: '20460137749',
    environment: 'testing' as const,
    businessName: 'Luca',
    address: 'Calle 123',
    grossIncome: 'Exento',
    activityStartDate: '2020-01-01',
  };

  const dto = {
    credentialId: 'cred-1',
    environment: 'production' as const,
    salesPoint: 1,
    amount: 1000,
    clientIvaCondition: 'Consumidor Final' as const,
  };

  let invoiceRepo: { findOneBy: jest.Mock; delete: jest.Mock };

  beforeEach(async () => {
    afipClient = {
      emitInvoice: jest.fn(),
      generatePdf: jest.fn(),
    } as unknown as jest.Mocked<AfipClientService>;
    credentialsService = {
      get: jest.fn().mockResolvedValue(fakeCredential),
    } as unknown as jest.Mocked<AfipCredentialsService>;
    authService = {
      getProfile: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'a@a.com',
        emailVerified: true,
      }),
    } as unknown as jest.Mocked<AuthService>;
    dataSource = createFakeDataSource();
    invoiceRepo = { findOneBy: jest.fn(), delete: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(IdempotencyKey), useValue: {} },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AfipCredentialsService, useValue: credentialsService },
        { provide: AfipClientService, useValue: afipClient },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get(InvoicesService);
  });

  it('rechaza sin Idempotency-Key', async () => {
    await expect(service.create('user-1', dto, '')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza si la credencial no existe', async () => {
    credentialsService.get.mockResolvedValue(null);
    await expect(service.create('user-1', dto, 'key-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rechaza emitir (real o de prueba) si el email no está verificado', async () => {
    authService.getProfile.mockResolvedValue({
      id: 'user-1',
      email: 'a@a.com',
      emailVerified: false,
    });
    await expect(service.create('user-1', dto, 'key-1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(afipClient.emitInvoice).not.toHaveBeenCalled();
  });

  it('emite normalmente y guarda la factura como issued', async () => {
    afipClient.emitInvoice.mockResolvedValue({
      cae: '123',
      caeExpiration: '2026-12-31',
      voucherNumber: 1,
    });

    const invoice = await service.create('user-1', dto, 'key-1');

    expect(afipClient.emitInvoice).toHaveBeenCalledTimes(1);
    expect(invoice).toMatchObject({ status: InvoiceStatus.ISSUED, cae: '123' });
  });

  it('con la misma Idempotency-Key no vuelve a llamar a ARCA', async () => {
    afipClient.emitInvoice.mockResolvedValue({
      cae: '123',
      caeExpiration: '2026-12-31',
      voucherNumber: 1,
    });

    const first = await service.create('user-1', dto, 'key-repetida');
    const second = await service.create('user-1', dto, 'key-repetida');

    expect(afipClient.emitInvoice).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('con una Idempotency-Key distinta sí emite otra factura', async () => {
    afipClient.emitInvoice.mockResolvedValue({
      cae: '123',
      caeExpiration: '2026-12-31',
      voucherNumber: 1,
    });

    await service.create('user-1', dto, 'key-a');
    await service.create('user-1', dto, 'key-b');

    expect(afipClient.emitInvoice).toHaveBeenCalledTimes(2);
  });

  it('si ARCA rechaza, guarda la factura como failed y tira BadRequestException', async () => {
    afipClient.emitInvoice.mockRejectedValue(new Error('CUIT inválido'));

    await expect(service.create('user-1', dto, 'key-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('guarda el snapshot del emisor al emitir', async () => {
    afipClient.emitInvoice.mockResolvedValue({
      cae: '123',
      caeExpiration: '2026-12-31',
      voucherNumber: 1,
    });

    const invoice = await service.create('user-1', dto, 'key-1');

    expect(invoice).toMatchObject({
      issuerCuit: fakeCredential.cuit,
      issuerBusinessName: fakeCredential.businessName,
      issuerAddress: fakeCredential.address,
      issuerGrossIncome: fakeCredential.grossIncome,
      issuerActivityStartDate: fakeCredential.activityStartDate,
    });
  });

  describe('getPdfBuffer', () => {
    const baseInvoice = {
      id: 'inv-1',
      userId: 'user-1',
      credentialId: 'cred-borrada',
      status: InvoiceStatus.ISSUED,
      environment: 'production' as const,
      salesPoint: 1,
      voucherNumber: 1,
      amount: '1000',
      cae: '123',
      caeExpiration: '2026-12-31',
      createdAt: new Date('2026-01-01'),
      clientIvaCondition: 'Consumidor Final' as const,
      saleCondition: 'Contado',
      concept: 1 as const,
    };

    beforeEach(() => {
      afipClient.generatePdf.mockResolvedValue(
        'https://example.com/factura.pdf',
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(1),
      });
    });

    it('usa el snapshot guardado en la factura, sin volver a buscar la credencial', async () => {
      invoiceRepo.findOneBy.mockResolvedValue({
        ...baseInvoice,
        issuerCuit: '20460137749',
        issuerBusinessName: 'Luca (al momento de emitir)',
        issuerAddress: 'Domicilio viejo',
        issuerGrossIncome: 'Exento',
        issuerActivityStartDate: '2020-01-01',
      });

      await service.getPdfBuffer('user-1', 'inv-1');

      expect(credentialsService.get).not.toHaveBeenCalled();
      expect(afipClient.generatePdf).toHaveBeenCalledWith(
        expect.objectContaining({
          businessName: 'Luca (al momento de emitir)',
          address: 'Domicilio viejo',
        }),
      );
    });

    it('factura vieja sin snapshot: cae a buscar la credencial actual', async () => {
      invoiceRepo.findOneBy.mockResolvedValue({ ...baseInvoice });

      await service.getPdfBuffer('user-1', 'inv-1');

      expect(credentialsService.get).toHaveBeenCalledWith(
        'user-1',
        'cred-borrada',
      );
      expect(afipClient.generatePdf).toHaveBeenCalledWith(
        expect.objectContaining({ businessName: fakeCredential.businessName }),
      );
    });

    it('factura vieja sin snapshot y credencial ya borrada: 404 (el bug original)', async () => {
      invoiceRepo.findOneBy.mockResolvedValue({ ...baseInvoice });
      credentialsService.get.mockResolvedValue(null);

      await expect(service.getPdfBuffer('user-1', 'inv-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('borra una factura de prueba (testing) aunque esté emitida', async () => {
      invoiceRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        userId: 'user-1',
        environment: 'testing',
        status: InvoiceStatus.ISSUED,
      });

      await expect(service.remove('user-1', 'inv-1')).resolves.toEqual({
        deleted: true,
      });
      expect(invoiceRepo.delete).toHaveBeenCalledWith({
        id: 'inv-1',
        userId: 'user-1',
      });
    });

    it('borra una factura rechazada (failed) aunque sea de producción', async () => {
      invoiceRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        userId: 'user-1',
        environment: 'production',
        status: InvoiceStatus.FAILED,
      });

      await expect(service.remove('user-1', 'inv-1')).resolves.toEqual({
        deleted: true,
      });
    });

    it('no deja borrar una factura real ya emitida (production + issued)', async () => {
      invoiceRepo.findOneBy.mockResolvedValue({
        id: 'inv-1',
        userId: 'user-1',
        environment: 'production',
        status: InvoiceStatus.ISSUED,
      });

      await expect(service.remove('user-1', 'inv-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(invoiceRepo.delete).not.toHaveBeenCalled();
    });

    it('404 si la factura no existe o no es del usuario', async () => {
      invoiceRepo.findOneBy.mockResolvedValue(null);

      await expect(service.remove('user-1', 'inv-x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
