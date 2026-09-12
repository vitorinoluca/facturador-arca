// Valida el dígito verificador real de un CUIT (no solo el formato de 11 dígitos).
// Algoritmo oficial de AFIP/ARCA: multiplicadores fijos sobre los primeros 10
// dígitos, módulo 11 contra el dígito 11.
export function isValidCuit(cuit: string): boolean {
  if (!/^\d{11}$/.test(cuit)) return false;

  const digits = cuit.split('').map(Number);
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = multipliers.reduce((acc, mult, i) => acc + mult * digits[i], 0);
  const remainder = 11 - (sum % 11);
  const checkDigit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder;

  return checkDigit === digits[10];
}
