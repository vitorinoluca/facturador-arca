import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Matches, MaxLength, ValidateIf } from 'class-validator';

export class CreateInvoiceDto {
  @IsUUID()
  credentialId: string;

  // testing = homologación (comprobantes de prueba, sin validez fiscal), production
  // = ARCA real. Se elige por factura, no por credencial.
  @IsIn(['testing', 'production'])
  environment: 'testing' | 'production';

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

  // 1 = Productos, 2 = Servicios, 3 = Productos y Servicios (códigos WSFEv1).
  // Si es Servicios (2 o 3), ARCA exige período facturado + vencimiento de pago.
  @IsOptional()
  @IsIn([1, 2, 3])
  concept?: 1 | 2 | 3;

  @ValidateIf((dto: CreateInvoiceDto) => dto.concept === 2 || dto.concept === 3)
  @IsDateString()
  serviceDateFrom?: string; // YYYY-MM-DD

  @ValidateIf((dto: CreateInvoiceDto) => dto.concept === 2 || dto.concept === 3)
  @IsDateString()
  serviceDateTo?: string; // YYYY-MM-DD

  @ValidateIf((dto: CreateInvoiceDto) => dto.concept === 2 || dto.concept === 3)
  @IsDateString()
  paymentDueDate?: string; // YYYY-MM-DD
}
