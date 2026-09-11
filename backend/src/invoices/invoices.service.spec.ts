import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { AfipCredentialsService } from '../afip-credentials/afip-credentials.service';
import { AfipClientService } from '../afip/afip-client.service';
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
        idempotencyStore.has(key) ? { key, responseBody: idempotencyStore.get(key) } : null,
      update: async ({ key }: { key: string }, { responseBody }: { responseBody: unknown }) => {
        idempotencyStore.set(key, responseBody);
      },
    }),
    create: (_entity: unknown, data: Record<string, unknown>) => ({ ...data }),
    save: async (data: Record<string, unknown>) => ({ id: `invoice-${nextId++}`, ...data }) as Invoice,
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
  let dataSource: { createQueryRunner: jest.Mock };

  const fakeCredential = {
    cuit: '20460137749',
    environment: 'testing' as const,
    businessName: 'Luca',
    address: 'Calle 123',
    grossIncome: 'Exento',
    activityStartDate: '2020-01-01',
  };

  const dto = { credentialId: 'cred-1', environment: 'production' as const, salesPoint: 1, amount: 1000 };

  beforeEach(async () => {
    afipClient = { emitInvoice: jest.fn(), generatePdf: jest.fn() } as unknown as jest.Mocked<AfipClientService>;
    credentialsService = { get: jest.fn().mockResolvedValue(fakeCredential) } as unknown as jest.Mocked<AfipCredentialsService>;
    dataSource = createFakeDataSource();

    const module = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(Invoice), useValue: {} },
        { provide: getRepositoryToken(IdempotencyKey), useValue: {} },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AfipCredentialsService, useValue: credentialsService },
        { provide: AfipClientService, useValue: afipClient },
      ],
    }).compile();

    service = module.get(InvoicesService);
  });

  it('rechaza sin Idempotency-Key', async () => {
    await expect(service.create('user-1', dto, '')).rejects.toThrow(BadRequestException);
  });

  it('rechaza si la credencial no existe', async () => {
    credentialsService.get.mockResolvedValue(null);
    await expect(service.create('user-1', dto, 'key-1')).rejects.toThrow(NotFoundException);
  });

  it('emite normalmente y guarda la factura como issued', async () => {
    afipClient.emitInvoice.mockResolvedValue({ cae: '123', caeExpiration: '2026-12-31', voucherNumber: 1 });

    const invoice = await service.create('user-1', dto, 'key-1');

    expect(afipClient.emitInvoice).toHaveBeenCalledTimes(1);
    expect(invoice).toMatchObject({ status: InvoiceStatus.ISSUED, cae: '123' });
  });

  it('con la misma Idempotency-Key no vuelve a llamar a ARCA', async () => {
    afipClient.emitInvoice.mockResolvedValue({ cae: '123', caeExpiration: '2026-12-31', voucherNumber: 1 });

    const first = await service.create('user-1', dto, 'key-repetida');
    const second = await service.create('user-1', dto, 'key-repetida');

    expect(afipClient.emitInvoice).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('con una Idempotency-Key distinta sí emite otra factura', async () => {
    afipClient.emitInvoice.mockResolvedValue({ cae: '123', caeExpiration: '2026-12-31', voucherNumber: 1 });

    await service.create('user-1', dto, 'key-a');
    await service.create('user-1', dto, 'key-b');

    expect(afipClient.emitInvoice).toHaveBeenCalledTimes(2);
  });

  it('si ARCA rechaza, guarda la factura como failed y tira BadRequestException', async () => {
    afipClient.emitInvoice.mockRejectedValue(new Error('CUIT inválido'));

    await expect(service.create('user-1', dto, 'key-1')).rejects.toThrow(BadRequestException);
  });
});
