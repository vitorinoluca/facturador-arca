import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AfipCredentialsService } from '../afip-credentials/afip-credentials.service';
import { AfipClientService } from '../afip/afip-client.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    private readonly credentialsService: AfipCredentialsService,
    private readonly afipClient: AfipClientService,
  ) {}

  async create(userId: string, dto: CreateInvoiceDto) {
    const credential = await this.credentialsService.getDecrypted(userId, dto.credentialId);
    if (!credential) {
      throw new NotFoundException('credencial de ARCA no encontrada');
    }

    try {
      const result = await this.afipClient.emitInvoice({
        cuit: credential.cuit,
        cert: credential.cert,
        key: credential.key,
        environment: credential.environment,
        salesPoint: dto.salesPoint,
        amount: dto.amount,
        clientCuit: dto.clientCuit,
      });

      return this.invoiceRepo.save(
        this.invoiceRepo.create({
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
      const failed = await this.invoiceRepo.save(
        this.invoiceRepo.create({
          userId,
          credentialId: dto.credentialId,
          salesPoint: dto.salesPoint,
          amount: dto.amount.toString(),
          clientCuit: dto.clientCuit,
          status: InvoiceStatus.FAILED,
          errorMessage: (err as Error).message,
        }),
      );
      throw new BadRequestException({ message: 'ARCA rechazó el comprobante', invoiceId: failed.id, cause: (err as Error).message });
    }
  }

  findForUser(userId: string) {
    return this.invoiceRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async getPdfUrl(userId: string, invoiceId: string): Promise<string> {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId, userId });
    if (!invoice || invoice.status !== InvoiceStatus.ISSUED) {
      throw new NotFoundException('factura no encontrada o no emitida');
    }
    const credential = await this.credentialsService.getDecrypted(userId, invoice.credentialId);
    if (!credential) {
      throw new NotFoundException('credencial de ARCA no encontrada');
    }

    return this.afipClient.generatePdf({
      cuit: credential.cuit,
      cert: credential.cert,
      key: credential.key,
      environment: credential.environment,
      salesPoint: invoice.salesPoint,
      voucherNumber: invoice.voucherNumber!,
      amount: Number(invoice.amount),
      cae: invoice.cae!,
      caeExpiration: invoice.caeExpiration!,
      issueDate: invoice.createdAt,
      clientCuit: invoice.clientCuit,
    });
  }
}
