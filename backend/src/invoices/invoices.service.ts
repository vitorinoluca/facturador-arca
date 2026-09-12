import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AfipCredentialsService } from '../afip-credentials/afip-credentials.service';
import { AfipClientService } from '../afip/afip-client.service';
import { AuthService } from '../auth/auth.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly credentialsService: AfipCredentialsService,
    private readonly afipClient: AfipClientService,
    private readonly authService: AuthService,
  ) {}

  async create(userId: string, dto: CreateInvoiceDto, idempotencyKey: string) {
    if (!idempotencyKey) {
      throw new BadRequestException('el header Idempotency-Key es obligatorio');
    }

    // sin email verificado no se emite nada — ni de prueba ni real — para
    // asegurarnos de que hay una casilla real detrás de cada comprobante.
    const profile = await this.authService.getProfile(userId);
    if (!profile.emailVerified) {
      throw new ForbiddenException(
        'confirmá tu email antes de emitir facturas',
      );
    }

    const credential = await this.credentialsService.get(
      userId,
      dto.credentialId,
    );
    if (!credential) {
      throw new NotFoundException('credencial de ARCA no encontrada');
    }

    // la tabla de idempotencia es global — namespacear por usuario evita que dos
    // usuarios que manden (o reusen) la misma Idempotency-Key terminen leyendo la
    // respuesta guardada del otro (fuga de datos entre cuentas).
    const scopedKey = `${userId}:${idempotencyKey}`;

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
        [scopedKey],
      );

      if (inserted.length === 0) {
        const existing = await idempotencyRepo.findOneBy({ key: scopedKey });
        await queryRunner.commitTransaction();
        return existing!.responseBody;
      }

      let savedInvoice: Invoice;
      try {
        const result = await this.afipClient.emitInvoice({
          cuit: credential.cuit,
          environment: dto.environment,
          salesPoint: dto.salesPoint,
          amount: dto.amount,
          clientCuit: dto.clientCuit,
          clientIvaCondition: dto.clientIvaCondition,
          concept: dto.concept ?? 1,
          serviceDateFrom: dto.serviceDateFrom,
          serviceDateTo: dto.serviceDateTo,
          paymentDueDate: dto.paymentDueDate,
        });

        savedInvoice = await queryRunner.manager.save(
          queryRunner.manager.create(Invoice, {
            userId,
            credentialId: dto.credentialId,
            environment: dto.environment,
            salesPoint: dto.salesPoint,
            amount: dto.amount.toString(),
            clientCuit: dto.clientCuit,
            clientIvaCondition: dto.clientIvaCondition,
            description: dto.description,
            saleCondition: dto.saleCondition ?? 'Contado',
            concept: dto.concept ?? 1,
            serviceDateFrom: dto.serviceDateFrom,
            serviceDateTo: dto.serviceDateTo,
            paymentDueDate: dto.paymentDueDate,
            cae: result.cae,
            caeExpiration: result.caeExpiration,
            voucherNumber: result.voucherNumber,
            status: InvoiceStatus.ISSUED,
            issuerCuit: credential.cuit,
            issuerBusinessName: credential.businessName,
            issuerAddress: credential.address,
            issuerGrossIncome: credential.grossIncome,
            issuerActivityStartDate: credential.activityStartDate,
          }),
        );
      } catch (err) {
        savedInvoice = await queryRunner.manager.save(
          queryRunner.manager.create(Invoice, {
            userId,
            credentialId: dto.credentialId,
            environment: dto.environment,
            salesPoint: dto.salesPoint,
            amount: dto.amount.toString(),
            clientCuit: dto.clientCuit,
            clientIvaCondition: dto.clientIvaCondition,
            description: dto.description,
            saleCondition: dto.saleCondition ?? 'Contado',
            concept: dto.concept ?? 1,
            serviceDateFrom: dto.serviceDateFrom,
            serviceDateTo: dto.serviceDateTo,
            paymentDueDate: dto.paymentDueDate,
            status: InvoiceStatus.FAILED,
            errorMessage: (err as Error).message,
          }),
        );
        await idempotencyRepo.update(
          { key: scopedKey },
          { responseBody: savedInvoice },
        );
        await queryRunner.commitTransaction();
        throw new BadRequestException({
          message: 'ARCA rechazó el comprobante',
          invoiceId: savedInvoice.id,
          cause: (err as Error).message,
        });
      }

      await idempotencyRepo.update(
        { key: scopedKey },
        { responseBody: savedInvoice },
      );
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
    return this.invoiceRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // borra solo lo que se puede borrar sin perder un registro fiscal real: facturas
  // de prueba (testing, sin validez fiscal) o que ARCA rechazó (sin CAE). Una factura
  // real ya emitida (production + issued) nunca se borra del historial.
  async remove(userId: string, invoiceId: string) {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId, userId });
    if (!invoice) {
      throw new NotFoundException('factura no encontrada');
    }
    if (
      invoice.environment === 'production' &&
      invoice.status === InvoiceStatus.ISSUED
    ) {
      throw new ForbiddenException(
        'no se puede borrar una factura real ya emitida',
      );
    }
    await this.invoiceRepo.delete({ id: invoiceId, userId });
    return { deleted: true };
  }

  // trae el PDF al servidor y lo devuelve como buffer en vez de redirigir al link de
  // afipsdk.com: ese link fuerza la descarga (Content-Disposition: attachment) en vez
  // de abrirlo en el navegador, y no podemos cambiar esa respuesta desde el cliente.
  async getPdfBuffer(userId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId, userId });
    if (!invoice || invoice.status !== InvoiceStatus.ISSUED) {
      throw new NotFoundException('factura no encontrada o no emitida');
    }
    // las facturas emitidas antes de guardar este snapshot no lo tienen — para esas
    // seguimos dependiendo de que la credencial actual siga existiendo.
    let issuer = {
      cuit: invoice.issuerCuit,
      businessName: invoice.issuerBusinessName,
      address: invoice.issuerAddress,
      grossIncome: invoice.issuerGrossIncome,
      activityStartDate: invoice.issuerActivityStartDate,
    };
    if (!issuer.cuit) {
      const credential = await this.credentialsService.get(
        userId,
        invoice.credentialId,
      );
      if (!credential) {
        throw new NotFoundException('credencial de ARCA no encontrada');
      }
      issuer = credential;
    }

    const url = await this.afipClient.generatePdf({
      cuit: issuer.cuit!,
      environment: invoice.environment,
      salesPoint: invoice.salesPoint,
      voucherNumber: invoice.voucherNumber!,
      amount: Number(invoice.amount),
      cae: invoice.cae!,
      caeExpiration: invoice.caeExpiration!,
      issueDate: invoice.createdAt,
      clientCuit: invoice.clientCuit,
      clientIvaCondition: invoice.clientIvaCondition,
      description: invoice.description,
      saleCondition: invoice.saleCondition,
      concept: invoice.concept,
      serviceDateFrom: invoice.serviceDateFrom,
      serviceDateTo: invoice.serviceDateTo,
      paymentDueDate: invoice.paymentDueDate,
      businessName: issuer.businessName!,
      address: issuer.address!,
      grossIncome: issuer.grossIncome!,
      activityStartDate: issuer.activityStartDate!,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new NotFoundException('no se pudo descargar el PDF generado');
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
