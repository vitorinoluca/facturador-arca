import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';
import { IsCuit } from '../../common/decorators/is-cuit.decorator';

export class CreateAfipCredentialDto {
  @IsCuit()
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
