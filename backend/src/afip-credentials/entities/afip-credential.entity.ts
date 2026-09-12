import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// El certificado que habla con ARCA es UNO SOLO, propio de la app (ver
// afip/afip-client.service.ts) — este registro es la "ficha" de un usuario que
// delegó la facturación electrónica en el CUIT de la app desde el Administrador de
// Relaciones de Clave Fiscal. No guarda ningún secreto de ARCA del usuario.
@Entity('afip_credentials')
export class AfipCredential {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  cuit: string;

  @Column({ default: 'testing' })
  environment: 'testing' | 'production';

  // datos reales del emisor para el PDF de la factura
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
