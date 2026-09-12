import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  // hash SHA-256 del token, nunca se guarda el valor real (igual criterio que las
  // contraseñas, aunque acá un hash rápido alcanza porque el token ya es de alta
  // entropía — no hace falta bcrypt).
  @Column()
  tokenHash: string;

  @Column()
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
