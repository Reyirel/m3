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
// PBKDF2 — estándar para hashing de contraseñas
// 100,000 iteraciones hacen que cada intento de fuerza bruta tome ~100ms.
// Una GPU que calcula mil millones de SHA-256/s solo puede hacer ~10,000 PBKDF2/s.
// ──────────────────────────────────────────────────────────────────────────────
export const hashPassword = async (password, salt) => {
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
      iterations: 100_000,
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
