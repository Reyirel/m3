// utils/hashUtils.js
// Utilidades criptográficas para hashing de contraseñas
// Usa PBKDF2 vía Web Crypto API (disponible en navegadores y React Native con Hermes ≥ 0.71)
//
// Jerarquía de formatos (del más viejo al más nuevo):
//   <sin prefijo>  → legacyHash (hash de 32 bits, inseguro — solo migración)
//   sha256:<hex>   → SHA-256 simple (intermedio — solo migración)
//   pbkdf2:<hex>   → PBKDF2 con 100,000 iteraciones (estándar actual)

// ──────────────────────────────────────────────────────────────────────────────
// LEGACY — solo para verificar contraseñas antiguas durante migración
// ──────────────────────────────────────────────────────────────────────────────
const PBKDF2_ITERATIONS = 100_000;

export const legacyHash = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

// ──────────────────────────────────────────────────────────────────────────────
// Implementación en JavaScript puro (respaldo)
// crypto.subtle no existe en la app nativa (Hermes) ni en páginas sin https. Sin este
// respaldo, una cuenta ya migrada a PBKDF2 no podía iniciar sesión en esos dispositivos:
// el cálculo lanzaba un error que se contaba como intento fallido y bloqueaba la cuenta.
// Produce exactamente el mismo resultado que la versión de Web Crypto.
// ──────────────────────────────────────────────────────────────────────────────
const hasSubtleCrypto = () =>
  typeof crypto !== 'undefined' && !!crypto && !!crypto.subtle && typeof crypto.subtle.deriveBits === 'function';

const utf8Bytes = (text) => {
  const bytes = [];
  const str = String(text);
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    // Par sustituto → un solo punto de código
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return Uint8Array.from(bytes);
};

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const SHA256_INIT = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
const sha256Words = new Uint32Array(64);

// Procesa un bloque de 64 bytes y actualiza el estado (8 palabras de 32 bits)
const sha256Compress = (state, block, offset) => {
  const w = sha256Words;
  for (let i = 0; i < 16; i++) {
    const j = offset + i * 4;
    w[i] = ((block[j] << 24) | (block[j + 1] << 16) | (block[j + 2] << 8) | block[j + 3]) >>> 0;
  }
  for (let i = 16; i < 64; i++) {
    const a = w[i - 15];
    const b = w[i - 2];
    const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
    const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
    w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
  }

  let a = state[0], b = state[1], c = state[2], d = state[3];
  let e = state[4], f = state[5], g = state[6], h = state[7];
  for (let i = 0; i < 64; i++) {
    const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
    const t1 = (h + S1 + ((e & f) ^ (~e & g)) + SHA256_K[i] + w[i]) >>> 0;
    const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
    const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
    h = g; g = f; f = e; e = (d + t1) >>> 0;
    d = c; c = b; b = a; a = (t1 + t2) >>> 0;
  }
  state[0] = (state[0] + a) >>> 0; state[1] = (state[1] + b) >>> 0;
  state[2] = (state[2] + c) >>> 0; state[3] = (state[3] + d) >>> 0;
  state[4] = (state[4] + e) >>> 0; state[5] = (state[5] + f) >>> 0;
  state[6] = (state[6] + g) >>> 0; state[7] = (state[7] + h) >>> 0;
};

// SHA-256 de `bytes`, continuando desde `state` tras haber procesado `prefixLength` bytes
const sha256Finish = (state, bytes, prefixLength) => {
  const totalBits = (prefixLength + bytes.length) * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  // Longitud en bits, big-endian (las contraseñas nunca superan 2^32 bits)
  padded[paddedLength - 4] = (totalBits >>> 24) & 0xff;
  padded[paddedLength - 3] = (totalBits >>> 16) & 0xff;
  padded[paddedLength - 2] = (totalBits >>> 8) & 0xff;
  padded[paddedLength - 1] = totalBits & 0xff;
  for (let offset = 0; offset < paddedLength; offset += 64) sha256Compress(state, padded, offset);

  const out = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    out[i * 4] = state[i] >>> 24;
    out[i * 4 + 1] = (state[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (state[i] >>> 8) & 0xff;
    out[i * 4 + 3] = state[i] & 0xff;
  }
  return out;
};

const sha256Bytes = (bytes) => sha256Finish(Uint32Array.from(SHA256_INIT), bytes, 0);

const toHex = (bytes) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 en JavaScript puro → hex */
export const sha256HexJs = (text) => toHex(sha256Bytes(utf8Bytes(text)));

/** PBKDF2-HMAC-SHA256 (32 bytes) en JavaScript puro → hex */
export const pbkdf2HexJs = async (password, salt, iterations) => {
  let key = utf8Bytes(password);
  if (key.length > 64) key = sha256Bytes(key);

  // Estados de HMAC tras procesar la clave: se calculan una vez y se reutilizan,
  // así cada iteración cuesta dos compresiones en lugar de cuatro
  const ipad = new Uint8Array(64).fill(0x36);
  const opad = new Uint8Array(64).fill(0x5c);
  for (let i = 0; i < key.length; i++) { ipad[i] ^= key[i]; opad[i] ^= key[i]; }
  const innerState = Uint32Array.from(SHA256_INIT);
  const outerState = Uint32Array.from(SHA256_INIT);
  sha256Compress(innerState, ipad, 0);
  sha256Compress(outerState, opad, 0);
  const hmac = (message) =>
    sha256Finish(Uint32Array.from(outerState), sha256Finish(Uint32Array.from(innerState), message, 64), 64);

  // Un solo bloque (32 bytes): U1 = HMAC(salt || INT(1))
  const saltBytes = utf8Bytes(salt);
  const first = new Uint8Array(saltBytes.length + 4);
  first.set(saltBytes);
  first[saltBytes.length + 3] = 1;

  let u = hmac(first);
  const result = Uint8Array.from(u);
  for (let i = 1; i < iterations; i++) {
    u = hmac(u);
    for (let j = 0; j < 32; j++) result[j] ^= u[j];
    // Ceder el hilo cada cierto tiempo para no congelar la pantalla durante el cálculo
    if (i % 10000 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  return toHex(result);
};

// ──────────────────────────────────────────────────────────────────────────────
// PBKDF2 — estándar para hashing de contraseñas
// 100,000 iteraciones hacen que cada intento de fuerza bruta tome ~100ms.
// Una GPU que calcula mil millones de SHA-256/s solo puede hacer ~10,000 PBKDF2/s.
// ──────────────────────────────────────────────────────────────────────────────
export const hashPassword = async (password, salt) => {
  if (!hasSubtleCrypto()) {
    return `pbkdf2:${await pbkdf2HexJs(password, salt, PBKDF2_ITERATIONS)}`;
  }
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hex = Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `pbkdf2:${hex}`;
};

// ──────────────────────────────────────────────────────────────────────────────
// SHA-256 simple — solo para verificar contraseñas del formato intermedio
// ──────────────────────────────────────────────────────────────────────────────
export const sha256Hash = async (password, salt) => {
  if (!hasSubtleCrypto()) {
    return 'sha256:' + sha256HexJs(password + salt);
  }
  const data = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Detecta el formato del hash almacenado
export const getHashFormat = (hash) => {
  if (typeof hash !== 'string') return 'unknown';
  if (hash.startsWith('pbkdf2:')) return 'pbkdf2';
  if (hash.startsWith('sha256:')) return 'sha256';
  return 'legacy';
};
