import { Injectable } from '@nestjs/common';
import Afip from '@afipsdk/afip.js';

function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

export interface EmitVoucherInput {
  cuit: string;
  cert: string;
  key: string;
  environment: 'testing' | 'production';
  salesPoint: number;
  amount: number;
  clientCuit?: string; // si no hay CUIT del cliente, se factura a consumidor final
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
    const afip = new Afip({
      CUIT: input.cuit,
      cert: input.cert,
      key: input.key,
      production: input.environment === 'production',
      // esta versión del SDK pasa por el proxy de afipsdk.com, no habla directo con
      // AFIP: hace falta un access_token gratuito de https://afipsdk.com
      access_token: process.env.AFIPSDK_ACCESS_TOKEN!,
    });

    const docTipo = input.clientCuit ? 80 : 99; // 80 = CUIT, 99 = consumidor final sin identificar
    const docNro = input.clientCuit ?? 0;

    let result;
    try {
      result = await afip.ElectronicBilling.createNextVoucher({
        CantReg: 1,
        PtoVta: input.salesPoint,
        CbteTipo: 11, // Factura C
        Concepto: 1, // productos
        CbteFch: formatDateYYYYMMDD(new Date()),
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
      // el interceptor de axios.js de @afipsdk/afip.js reescribe los errores HTTP del
      // proxy de afipsdk.com como { message, status, data }, no como AxiosError normal
      // (err.response.data) — el detalle real de por qué falló está en err.data.
      const responseData = (err as { data?: unknown }).data;
      const detail = responseData ? JSON.stringify(responseData) : (err as Error).message;
      throw new Error(detail);
    }

    return {
      cae: result.CAE,
      caeExpiration: result.CAEFchVto,
      voucherNumber: result.voucherNumber,
    };
  }
}
