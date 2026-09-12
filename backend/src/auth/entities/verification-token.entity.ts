import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum VerificationTokenPurpose {
  EMAIL_VERIFY = 'email_verify',
  PASSWORD_RESET = 'password_reset',
}

// Una tabla para los dos flujos (verificar mail, resetear contraseña) — mismo
// shape (hash + vencimiento + un solo uso), la diferencia es solo qué hace
// AuthService al consumirlo.
@Entity('verification_tokens')
export class VerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  tokenHash: string;

  @Column({ type: 'enum', enum: VerificationTokenPurpose })
  purpose: VerificationTokenPurpose;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  usedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
