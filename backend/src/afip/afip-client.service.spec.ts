import { formatDateDDMMYYYY, formatDateStringDDMMYYYY, formatDateYYYYMMDD } from './afip-client.service';

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
