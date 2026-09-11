import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AfipCredential } from './afip-credentials/entities/afip-credential.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { User } from './auth/entities/user.entity';
import { IdempotencyKey } from './invoices/entities/idempotency-key.entity';
import { Invoice } from './invoices/entities/invoice.entity';

// DataSource separado para el CLI de TypeORM (generar/correr migraciones). El
// runtime de la app usa su propia configuración en app.module.ts.
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, RefreshToken, AfipCredential, Invoice, IdempotencyKey],
  migrations: ['src/migrations/*.ts'],
});
