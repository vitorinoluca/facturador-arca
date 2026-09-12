import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // nullable: una cuenta creada por "Iniciar sesión con Google" no tiene contraseña
  // propia hasta que el usuario decida ponerle una (no implementado — no hace falta
  // si solo entra por Google).
  @Column({ nullable: true })
  passwordHash?: string;

  // null si nunca se logueó con Google. Es el "sub" (id de cuenta) que manda Google,
  // no el email — el email puede cambiar del lado de Google, el sub no.
  @Column({ nullable: true, unique: true })
  googleId?: string;

  // true automáticamente si vino de Google (Google ya verificó ese mail). Si vino de
  // registro con contraseña, se pone en true recién cuando confirma el link que
  // mandamos por mail.
  @Column({ default: false })
  emailVerified: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
