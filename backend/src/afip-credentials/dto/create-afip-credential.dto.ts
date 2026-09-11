import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAfipCredentialDto {
  @Matches(/^\d{11}$/, { message: 'cuit debe tener 11 dígitos' })
  cuit: string;

  @IsString()
  cert: string; // contenido del .crt (PEM)

  @IsString()
  key: string; // contenido de la clave privada (PEM)

  @IsOptional()
  @IsIn(['testing', 'production'])
  environment?: 'testing' | 'production';
}
