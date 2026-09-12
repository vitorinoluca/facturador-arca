import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
// TypeORM carga el driver de postgres con un require() dinámico (PlatformTools.load),
// invisible para el file tracer de Vercel — sin este import estático, la función
// serverless se deployaba sin node_modules/pg y tiraba DriverPackageNotInstalledError.
import 'pg';
import { AfipCredentialsModule } from './afip-credentials/afip-credentials.module';
import { AfipCredential } from './afip-credentials/entities/afip-credential.entity';
import { AuthModule } from './auth/auth.module';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { User } from './auth/entities/user.entity';
import { VerificationToken } from './auth/entities/verification-token.entity';
import { IdempotencyKey } from './invoices/entities/idempotency-key.entity';
import { Invoice } from './invoices/entities/invoice.entity';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // límite general de la app; login/register tienen su propio límite más estricto
    // vía @Throttle en el controller (son el blanco típico de fuerza bruta)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        User,
        RefreshToken,
        VerificationToken,
        AfipCredential,
        Invoice,
        IdempotencyKey,
      ],
      migrations: [__dirname + '/migrations/*.{js,ts}'],
      // las migraciones corren como paso del build (ver vercel.json / README), no
      // acá — en serverless cada cold start crearía esta app de nuevo, y correrlas
      // en cada arranque es innecesario (ya corrieron) y arriesga una carrera si dos
      // cold starts arrancan a la vez.
      migrationsRun: false,
      synchronize: false,
      // Neon (y la mayoría de los Postgres administrados) piden TLS; localhost no.
      ssl: process.env.DATABASE_URL?.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
    }),
    AuthModule,
    AfipCredentialsModule,
    InvoicesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
