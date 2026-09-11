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

  @CreateDateColumn()
  createdAt: Date;
}
