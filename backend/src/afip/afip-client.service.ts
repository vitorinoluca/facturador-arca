import { Injectable } from '@nestjs/common';
import Afip from '@afipsdk/afip.js';

export function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

export function formatDateStringYYYYMMDD(yyyyMmDd: string): string {
  return yyyyMmDd.replace(/-/g, '');
}

export function formatDateDDMMYYYY(date: Date): string {
  return formatDateStringDDMMYYYY(date.toISOString().slice(0, 10));
}

export function formatDateStringDDMMYYYY(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-');
  return `${d}/${m}/${y}`;
}

// El certificado que autentica contra ARCA es UNO SOLO por ambiente, de la app (no
// de cada usuario): cada usuario delega la facturación electrónica en este CUIT
// desde el Administrador de Relaciones de Clave Fiscal. El `CUIT` que se le pasa a
// Afip() abajo es el del usuario REPRESENTADO — ARCA valida server-side que este
// certificado esté autorizado para actuar en su nombre; no hace falta que el
// certificado le pertenezca.
// Testing y producción usan certificados DISTINTOS (ARCA no confía el mismo
// certificado en los dos ambientes), así que hay un par de variables por ambiente.
function getAppCertificate(environment: 'testing' | 'production') {
  const prefix = environment === 'production' ? 'AFIP_APP_CERT_PRODUCTION' : 'AFIP_APP_CERT_TESTING';
  const keyPrefix = environment === 'production' ? 'AFIP_APP_KEY_PRODUCTION' : 'AFIP_APP_KEY_TESTING';
  const cert = process.env[prefix]?.replace(/\\n/g, '\n');
  const key = process.env[keyPrefix]?.replace(/\\n/g, '\n');
  if (!cert || !key) {
    throw new Error(`${prefix} / ${keyPrefix} no están configurados en el servidor`);
  }
  return { cert, key };
}

function buildAfipClient(creds: { cuit: string; environment: 'testing' | 'production' }) {
  const { cert, key } = getAppCertificate(creds.environment);
  return new Afip({
    CUIT: creds.cuit,
    cert,
    key,
    production: creds.environment === 'production',
    // esta versión del SDK pasa por el proxy de afipsdk.com, no habla directo con
    // AFIP: hace falta un access_token gratuito de https://afipsdk.com
    access_token: process.env.AFIPSDK_ACCESS_TOKEN!,
  });
}

export interface TaxpayerLookupResult {
  businessName: string;
  address: string;
  activityStartDate?: string; // yyyy-mm-dd
}

function extractErrorDetail(err: unknown): string {
  // el interceptor de axios.js de @afipsdk/afip.js reescribe los errores HTTP del
  // proxy de afipsdk.com como { message, status, data }, no como AxiosError normal
  // (err.response.data) — el detalle real del rechazo de ARCA viaja en err.data.
  const responseData = (err as { data?: unknown }).data;
  return responseData ? JSON.stringify(responseData) : (err as Error).message;
}

export interface GeneratePdfInput {
  cuit: string;
  environment: 'testing' | 'production';
  salesPoint: number;
  voucherNumber: number;
  amount: number;
  cae: string;
  caeExpiration: string; // yyyy-mm-dd
  issueDate: Date;
  clientCuit?: string;
  description?: string;
  concept: 1 | 2 | 3;
  serviceDateFrom?: string; // yyyy-mm-dd, requerido si concept es 2 o 3
  serviceDateTo?: string;
  paymentDueDate?: string;
  businessName: string;
  address: string;
  grossIncome: string;
  activityStartDate: string; // yyyy-mm-dd
}

export interface EmitVoucherInput {
  cuit: string;
  environment: 'testing' | 'production';
  salesPoint: number;
  amount: number;
  clientCuit?: string; // si no hay CUIT del cliente, se factura a consumidor final
  concept: 1 | 2 | 3; // 1 Productos, 2 Servicios, 3 Ambos
  serviceDateFrom?: string; // yyyy-mm-dd, requerido si concept es 2 o 3
  serviceDateTo?: string;
  paymentDueDate?: string;
}

export interface EmitVoucherResult {
  cae: string;
  caeExpiration: string;
  voucherNumber: number;
}

// Wrapper fino sobre @afipsdk/afip.js: arma el payload de WSFEv1 para Factura C
// (tipo 11 — la que emite un monotributista) y pide el CAE.
// ponytail: solo Factura C a consumidor final o con CUIT; A/B, notas de crédito
// y multi-comprobante quedan para cuando haya un primer usuario real pidiéndolo.
@Injectable()
export class AfipClientService {
  async emitInvoice(input: EmitVoucherInput): Promise<EmitVoucherResult> {
    // ARCA exige período facturado y vencimiento de pago cuando el concepto no es
    // "solo productos" (WSFEv1: FchServDesde/FchServHasta/FchVtoPago obligatorios
    // si Concepto es 2 o 3) — sin esto rechaza el comprobante. Se valida antes de
    // instanciar el cliente para no depender del certificado en este chequeo.
    const isService = input.concept === 2 || input.concept === 3;
    if (isService && (!input.serviceDateFrom || !input.serviceDateTo || !input.paymentDueDate)) {
      throw new Error('Servicios requiere período facturado (desde/hasta) y fecha de vencimiento de pago');
    }

    const afip = buildAfipClient(input);

    const docTipo = input.clientCuit ? 80 : 99; // 80 = CUIT, 99 = consumidor final sin identificar
    const docNro = input.clientCuit ?? 0;

    let result;
    try {
      result = await afip.ElectronicBilling.createNextVoucher({
        CantReg: 1,
        PtoVta: input.salesPoint,
        CbteTipo: 11, // Factura C
        Concepto: input.concept,
        CbteFch: formatDateYYYYMMDD(new Date()),
        ...(isService && {
          FchServDesde: formatDateStringYYYYMMDD(input.serviceDateFrom!),
          FchServHasta: formatDateStringYYYYMMDD(input.serviceDateTo!),
          FchVtoPago: formatDateStringYYYYMMDD(input.paymentDueDate!),
        }),
        DocTipo: docTipo,
        DocNro: docNro,
        // ponytail: condición de IVA fija (5 = Consumidor Final, 1 = Responsable
        // Inscripto si hay CUIT) — la condición real del receptor requiere
        // consultarla con FEParamGetCondicionIvaReceptor; se ajusta cuando haga falta
        // facturar a otras condiciones (monotributista, exento, etc.).
        CondicionIVAReceptorId: input.clientCuit ? 1 : 5,
        ImpTotal: input.amount,
        ImpTotConc: 0,
        ImpNeto: input.amount,
        ImpOpEx: 0,
        ImpIVA: 0,
        ImpTrib: 0,
        MonId: 'PES',
        MonCotiz: 1,
      });
    } catch (err) {
      throw new Error(extractErrorDetail(err));
    }

    return {
      cae: result.CAE,
      caeExpiration: result.CAEFchVto,
      voucherNumber: result.voucherNumber,
    };
  }

  // Arma el PDF con el diseño oficial de Factura C vía la plantilla hosteada de
  // afipsdk.com, con los datos reales del emisor cargados en la credencial.
  async generatePdf(input: GeneratePdfInput): Promise<string> {
    const afip = buildAfipClient(input);
    const hasClientCuit = !!input.clientCuit;

    let result;
    try {
      result = await afip.ElectronicBilling.createPDF({
        file_name: `factura-${input.salesPoint}-${input.voucherNumber}.pdf`,
        template: {
          name: 'invoice-c',
          params: {
            voucher_number: input.voucherNumber,
            sales_point: input.salesPoint,
            issue_date: formatDateDDMMYYYY(input.issueDate),
            cae_due_date: formatDateDDMMYYYY(new Date(input.caeExpiration)),
            issuer_cuit: Number(input.cuit),
            cae: Number(input.cae),
            issuer_business_name: input.businessName,
            issuer_address: input.address,
            issuer_iva_condition: 'Responsable Monotributo',
            issuer_gross_income: input.grossIncome,
            issuer_activity_start_date: formatDateStringDDMMYYYY(input.activityStartDate),
            receiver_name: hasClientCuit ? `CUIT ${input.clientCuit}` : 'CONSUMIDOR FINAL',
            receiver_address: '-',
            receiver_document_type: hasClientCuit ? 80 : 99,
            receiver_document_number: hasClientCuit ? Number(input.clientCuit) : 0,
            receiver_iva_condition: hasClientCuit ? 'Responsable Inscripto' : 'Consumidor Final',
            sale_condition: 'Contado',
            currency_id: 'ARS',
            currency_rate: 1,
            concept: input.concept,
            ...(input.serviceDateFrom && { billing_from: formatDateStringDDMMYYYY(input.serviceDateFrom) }),
            ...(input.serviceDateTo && { billing_to: formatDateStringDDMMYYYY(input.serviceDateTo) }),
            ...(input.paymentDueDate && { payment_due_date: formatDateStringDDMMYYYY(input.paymentDueDate) }),
            items: [
              {
                code: '001',
                description: input.description?.trim() || 'Servicio',
                quantity: 1,
                unit_price: input.amount,
                subtotal: input.amount,
              },
            ],
            vat_amount: 0,
            tributes_amount: 0,
            total_amount: input.amount,
            net_amount_taxed: 0,
            net_amount_untaxed: input.amount,
            exempt_amount: 0,
          },
        },
      });
    } catch (err) {
      throw new Error(extractErrorDetail(err));
    }

    return result.file;
  }

  // Consulta la Constancia de Inscripción del CUIT dado (ws_sr_constancia_inscripcion)
  // para autocompletar razón social y domicilio — evita que el usuario los tipee a
  // mano. Requiere que el certificado de la app esté autorizado a este servicio en
  // ARCA (autorización separada de wsfe). Verificado contra el servicio real: la
  // respuesta NO trae fecha de inicio de actividades a este nivel — ese campo sigue
  // siendo manual.
  async lookupTaxpayer(cuit: string, environment: 'testing' | 'production'): Promise<TaxpayerLookupResult | null> {
    const appCuit = process.env.AFIP_APP_CUIT;
    if (!appCuit) {
      throw new Error('AFIP_APP_CUIT no está configurado en el servidor');
    }
    const afip = buildAfipClient({ cuit: appCuit, environment });

    let details: unknown;
    try {
      details = await afip.RegisterInscriptionProof.getTaxpayerDetails(Number(cuit));
    } catch (err) {
      throw new Error(extractErrorDetail(err));
    }
    if (!details) return null;

    const persona = (details as { datosGenerales?: Record<string, unknown> }).datosGenerales ?? details;
    const p = persona as Record<string, unknown>;

    const businessName =
      (p.razonSocial as string) ?? [p.nombre, p.apellido].filter(Boolean).join(' ').trim() ?? '';

    const domicilio = (p.domicilioFiscal ?? {}) as Record<string, unknown>;
    const address = [domicilio.direccion, domicilio.localidad, domicilio.descripcionProvincia]
      .filter(Boolean)
      .join(', ');

    const fechaInicio = (p.fechaInicioActividad as string) ?? (p.fechaInscripcion as string) ?? undefined;
    const activityStartDate = fechaInicio ? fechaInicio.slice(0, 10) : undefined;

    return { businessName, address, activityStartDate };
  }
}
