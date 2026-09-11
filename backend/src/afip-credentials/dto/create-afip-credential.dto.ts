import { IsDateString, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateAfipCredentialDto {
  @Matches(/^\d{11}$/, { message: 'cuit debe tener 11 dígitos' })
  cuit: string;

  @MinLength(2)
  businessName: string; // razón social, va en el PDF de la factura

  @MinLength(2)
  address: string; // domicilio comercial, va en el PDF

  @IsOptional()
  @IsString()
  grossIncome?: string; // n° de Ingresos Brutos, o "Exento"

  @IsDateString()
  activityStartDate: string; // fecha de inicio de actividades (YYYY-MM-DD)
}
