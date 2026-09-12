import { isValidCuit } from './is-valid-cuit';

describe('isValidCuit', () => {
  it('acepta un CUIT real con dígito verificador correcto', () => {
    expect(isValidCuit('20460137749')).toBe(true);
  });

  it('rechaza el mismo CUIT con el dígito verificador cambiado', () => {
    expect(isValidCuit('20460137740')).toBe(false);
  });

  it('rechaza formatos que no son 11 dígitos', () => {
    expect(isValidCuit('123')).toBe(false);
    expect(isValidCuit('20-46013774-9')).toBe(false);
    expect(isValidCuit('')).toBe(false);
  });
});
