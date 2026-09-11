import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  credentialId: string;

  @IsNumber()
  @IsPositive()
  salesPoint: number;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'clientCuit debe tener 11 dígitos' })
  clientCuit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string; // qué se factura — va como ítem en el PDF
}
