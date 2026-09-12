import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import { CLIENT_IVA_CONDITIONS } from '../../afip/afip-client.service';
import type { ClientIvaCondition } from '../../afip/afip-client.service';
import { IsCuit } from '../../common/decorators/is-cuit.decorator';

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

  @IsIn(Object.keys(CLIENT_IVA_CONDITIONS))
  clientIvaCondition: ClientIvaCondition;

  // obligatorio salvo Consumidor Final (el resto de las condiciones de IVA
  // requieren identificar al receptor ante ARCA)
  @ValidateIf((dto: CreateInvoiceDto) => dto.clientIvaCondition !== 'Consumidor Final')
  @IsString()
  @IsCuit()
  clientCuit?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string; // qué se factura — va como ítem en el PDF

  // solo texto del PDF (no lo valida WSFEv1), pero condiciona lo que ARCA espera ver
  // impreso en el comprobante
  @IsOptional()
  @IsIn(['Contado', 'Cuenta Corriente', 'Tarjeta de Crédito', 'Tarjeta de Débito', 'Cheque'])
  saleCondition?: string;

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
