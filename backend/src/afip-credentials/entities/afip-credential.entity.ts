import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('afip_credentials')
export class AfipCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  cuit: string;

  // certificado y clave privada guardados encriptados (ver common/crypto.util.ts)
  @Column({ type: 'text' })
  certEncrypted: string;

  @Column({ type: 'text' })
  keyEncrypted: string;

  @Column({ default: 'testing' })
  environment: 'testing' | 'production';

  // datos reales del emisor para el PDF de la factura (antes iban hardcodeados)
  @Column()
  businessName: string;

  @Column()
  address: string;

  @Column({ default: 'Exento' })
  grossIncome: string;

  @Column({ type: 'date' })
  activityStartDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
