import {
  AfipClientService,
  formatDateDDMMYYYY,
  formatDateStringDDMMYYYY,
  formatDateStringYYYYMMDD,
  formatDateYYYYMMDD,
} from './afip-client.service';

describe('formatDateYYYYMMDD', () => {
  it('formatea sin separadores, como pide WSFEv1 (CbteFch)', () => {
    expect(formatDateYYYYMMDD(new Date('2026-03-05T12:00:00Z'))).toBe('20260305');
  });
});

describe('formatDateDDMMYYYY', () => {
  it('formatea con separadores, como pide la plantilla del PDF', () => {
    expect(formatDateDDMMYYYY(new Date('2026-03-05T12:00:00Z'))).toBe('05/03/2026');
  });
});

describe('formatDateStringDDMMYYYY', () => {
  it('convierte un string yyyy-mm-dd (de un <input type="date">) a dd/mm/yyyy', () => {
    expect(formatDateStringDDMMYYYY('2020-12-31')).toBe('31/12/2020');
  });
});

describe('formatDateStringYYYYMMDD', () => {
  it('saca los guiones, como pide WSFEv1 para FchServDesde/Hasta/FchVtoPago', () => {
    expect(formatDateStringYYYYMMDD('2026-03-05')).toBe('20260305');
  });
});

describe('AfipClientService.emitInvoice — validación de Servicios', () => {
  it('rechaza Concepto Servicios sin período facturado ni vencimiento de pago', async () => {
    const service = new AfipClientService();
    await expect(
      service.emitInvoice({
        cuit: '20460137749',
        environment: 'testing',
        salesPoint: 1,
        amount: 1000,
        clientIvaCondition: 'Consumidor Final',
        concept: 2, // Servicios — exige las fechas
      }),
    ).rejects.toThrow(/período facturado/i);
  });
});
