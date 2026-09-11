import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

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

  @Column('decimal', { precision: 12, scale: 2 })
  amount: string;

  @Column({ nullable: true })
  clientCuit?: string;

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
