import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AfipCredentialsModule } from './afip-credentials/afip-credentials.module';
import { AfipCredential } from './afip-credentials/entities/afip-credential.entity';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { IdempotencyKey } from './invoices/entities/idempotency-key.entity';
import { Invoice } from './invoices/entities/invoice.entity';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, AfipCredential, Invoice, IdempotencyKey],
      synchronize: true, // dev only, hasta que existan migraciones
    }),
    AuthModule,
    AfipCredentialsModule,
    InvoicesModule,
  ],
})
export class AppModule {}
