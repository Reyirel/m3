// tests/hashUtils.test.js
// El respaldo en JavaScript puro debe dar EXACTAMENTE el mismo hash que Web Crypto:
// si no, una cuenta no podría iniciar sesión en la app nativa con la contraseña que
// sí funciona en el navegador.

import { webcrypto } from 'crypto';
import { hashPassword, sha256Hash, pbkdf2HexJs, sha256HexJs } from '../utils/hashUtils';

const CASES = [
  ['admin123', 'admin@todo.com'],
  ['Contraseña-ñ-€-😀', 'josé.núñez@municipio.com'],
  ['x', 'a@b.c'],
  ['una contraseña bastante larga que supera con mucho los sesenta y cuatro bytes de un bloque', 'largo@municipio.com'],
];

describe('respaldo en JavaScript puro', () => {
  const originalCrypto = globalThis.crypto;
  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true, writable: true });
  });
  const setCrypto = (value) =>
    Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });

  test('SHA-256 coincide con valores conocidos', () => {
    expect(sha256HexJs('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256HexJs('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  test('PBKDF2 coincide con el vector de prueba estándar', async () => {
    // RFC 7914 §11: PBKDF2-HMAC-SHA256("passwd", "salt", 1 iteración), primeros 32 bytes
    expect(await pbkdf2HexJs('passwd', 'salt', 1))
      .toBe('55ac046e56e3089fec1691c22544b605f94185216dde0465e68b9d57c20dacbc');
  });

  test.each(CASES)('hashPassword da el mismo resultado con y sin Web Crypto (%s)', async (password, salt) => {
    setCrypto(webcrypto);
    const withWebCrypto = await hashPassword(password, salt);

    setCrypto(undefined);
    const withFallback = await hashPassword(password, salt);

    expect(withWebCrypto).toMatch(/^pbkdf2:[0-9a-f]{64}$/);
    expect(withFallback).toBe(withWebCrypto);
  }, 60000);

  test.each(CASES)('sha256Hash da el mismo resultado con y sin Web Crypto (%s)', async (password, salt) => {
    setCrypto(webcrypto);
    const withWebCrypto = await sha256Hash(password, salt);

    setCrypto(undefined);
    expect(await sha256Hash(password, salt)).toBe(withWebCrypto);
  });
});
