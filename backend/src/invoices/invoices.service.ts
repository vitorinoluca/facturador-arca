import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AfipCredentialsService } from '../afip-credentials/afip-credentials.service';
import { AfipClientService } from '../afip/afip-client.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly credentialsService: AfipCredentialsService,
    private readonly afipClient: AfipClientService,
  ) {}

  async create(userId: string, dto: CreateInvoiceDto, idempotencyKey: string) {
    if (!idempotencyKey) {
      throw new BadRequestException('el header Idempotency-Key es obligatorio');
    }

    const credential = await this.credentialsService.get(userId, dto.credentialId);
    if (!credential) {
      throw new NotFoundException('credencial de ARCA no encontrada');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // INSERT ... ON CONFLICT DO NOTHING: si esta key ya se procesó (o se está
      // procesando en otro request concurrente), Postgres bloquea el insert hasta que
      // esa otra transacción termine, y acá abajo devolvemos su resultado guardado en
      // vez de volver a llamar a ARCA — así un doble click nunca genera dos facturas.
      const idempotencyRepo = queryRunner.manager.getRepository(IdempotencyKey);
      const inserted: Array<{ key: string }> = await queryRunner.query(
        `INSERT INTO idempotency_keys(key) VALUES ($1) ON CONFLICT (key) DO NOTHING RETURNING key`,
        [idempotencyKey],
      );

      if (inserted.length === 0) {
        const existing = await idempotencyRepo.findOneBy({ key: idempotencyKey });
        await queryRunner.commitTransaction();
        return existing!.responseBody;
      }

      let savedInvoice: Invoice;
      try {
        const result = await this.afipClient.emitInvoice({
          cuit: credential.cuit,
          environment: credential.environment,
          salesPoint: dto.salesPoint,
          amount: dto.amount,
          clientCuit: dto.clientCuit,
        });

        savedInvoice = await queryRunner.manager.save(
          queryRunner.manager.create(Invoice, {
            userId,
            credentialId: dto.credentialId,
            salesPoint: dto.salesPoint,
            amount: dto.amount.toString(),
            clientCuit: dto.clientCuit,
            cae: result.cae,
            caeExpiration: result.caeExpiration,
            voucherNumber: result.voucherNumber,
            status: InvoiceStatus.ISSUED,
          }),
        );
      } catch (err) {
        savedInvoice = await queryRunner.manager.save(
          queryRunner.manager.create(Invoice, {
            userId,
            credentialId: dto.credentialId,
            salesPoint: dto.salesPoint,
            amount: dto.amount.toString(),
            clientCuit: dto.clientCuit,
            status: InvoiceStatus.FAILED,
            errorMessage: (err as Error).message,
          }),
        );
        await idempotencyRepo.update({ key: idempotencyKey }, { responseBody: savedInvoice });
        await queryRunner.commitTransaction();
        throw new BadRequestException({
          message: 'ARCA rechazó el comprobante',
          invoiceId: savedInvoice.id,
          cause: (err as Error).message,
        });
      }

      await idempotencyRepo.update({ key: idempotencyKey }, { responseBody: savedInvoice });
      await queryRunner.commitTransaction();
      return savedInvoice;
    } catch (err) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  findForUser(userId: string) {
    return this.invoiceRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  // trae el PDF al servidor y lo devuelve como buffer en vez de redirigir al link de
  // afipsdk.com: ese link fuerza la descarga (Content-Disposition: attachment) en vez
  // de abrirlo en el navegador, y no podemos cambiar esa respuesta desde el cliente.
  async getPdfBuffer(userId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId, userId });
    if (!invoice || invoice.status !== InvoiceStatus.ISSUED) {
      throw new NotFoundException('factura no encontrada o no emitida');
    }
    const credential = await this.credentialsService.get(userId, invoice.credentialId);
    if (!credential) {
      throw new NotFoundException('credencial de ARCA no encontrada');
    }

    const url = await this.afipClient.generatePdf({
      cuit: credential.cuit,
      environment: credential.environment,
      salesPoint: invoice.salesPoint,
      voucherNumber: invoice.voucherNumber!,
      amount: Number(invoice.amount),
      cae: invoice.cae!,
      caeExpiration: invoice.caeExpiration!,
      issueDate: invoice.createdAt,
      clientCuit: invoice.clientCuit,
      businessName: credential.businessName,
      address: credential.address,
      grossIncome: credential.grossIncome,
      activityStartDate: credential.activityStartDate,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new NotFoundException('no se pudo descargar el PDF generado');
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
