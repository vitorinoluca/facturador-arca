import { decrypt, encrypt } from './crypto.util';

describe('crypto.util', () => {
  const originalKey = process.env.CREDENTIALS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'a'.repeat(64);
  });

  afterAll(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = originalKey;
  });

  it('desencripta lo que encriptó', () => {
    const plainText = '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----';
    expect(decrypt(encrypt(plainText))).toBe(plainText);
  });

  it('nunca produce el mismo texto cifrado dos veces (IV random)', () => {
    const plainText = 'misma clave privada';
    expect(encrypt(plainText)).not.toBe(encrypt(plainText));
  });

  it('rechaza desencriptar con la key incorrecta', () => {
    const encrypted = encrypt('secreto');
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'b'.repeat(64);
    expect(() => decrypt(encrypted)).toThrow();
  });

  it('exige una key de 32 bytes en hex', () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'muy-corta';
    expect(() => encrypt('x')).toThrow('CREDENTIALS_ENCRYPTION_KEY debe ser un hex de 32 bytes (64 caracteres)');
  });
});
