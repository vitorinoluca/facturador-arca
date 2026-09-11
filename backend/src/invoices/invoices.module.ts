import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AfipCredentialsModule } from '../afip-credentials/afip-credentials.module';
import { AfipClientService } from '../afip/afip-client.service';
import { AuthModule } from '../auth/auth.module';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, IdempotencyKey]), AfipCredentialsModule, AuthModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, AfipClientService],
})
export class InvoicesModule {}
