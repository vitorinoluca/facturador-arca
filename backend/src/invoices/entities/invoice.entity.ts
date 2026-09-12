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

  // Snapshot de los datos del emisor al momento de emitir, para no depender de que
  // la credencial siga existiendo (o sin cambios) cuando se regenera el PDF más
  // adelante — si se borra la credencial y se crea una nueva, el id cambia y el PDF
  // de facturas viejas dejaba de poder generarse. Nullable porque las facturas
  // emitidas antes de esta columna no lo tienen: para esas, getPdfBuffer cae de
  // vuelta a buscar la credencial actual (comportamiento previo).
  @Column({ nullable: true })
  issuerCuit?: string;

  @Column({ nullable: true })
  issuerBusinessName?: string;

  @Column({ nullable: true })
  issuerAddress?: string;

  @Column({ nullable: true })
  issuerGrossIncome?: string;

  @Column({ type: 'date', nullable: true })
  issuerActivityStartDate?: string;

  @CreateDateColumn()
  createdAt: Date;
}
