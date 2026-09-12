import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { ClientIvaCondition } from '../../afip/afip-client.service';

export enum InvoiceStatus {
  ISSUED = 'issued',
  FAILED = 'failed',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  credentialId: string;

  @Column()
  salesPoint: number;

  @Column({ default: 'production' })
  environment: 'testing' | 'production';

  @Column('decimal', { precision: 12, scale: 2 })
  amount: string;

  @Column({ nullable: true })
  clientCuit?: string;

  @Column({ default: 'Consumidor Final' })
  clientIvaCondition: ClientIvaCondition;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'Contado' })
  saleCondition: string;

  @Column({ default: 1 })
  concept: 1 | 2 | 3;

  @Column({ type: 'date', nullable: true })
  serviceDateFrom?: string;

  @Column({ type: 'date', nullable: true })
  serviceDateTo?: string;

  @Column({ type: 'date', nullable: true })
  paymentDueDate?: string;

  @Column({ nullable: true })
  cae?: string;

  @Column({ nullable: true })
  caeExpiration?: string;

  @Column({ nullable: true })
  voucherNumber?: number;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.FAILED })
  status: InvoiceStatus;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;
}
