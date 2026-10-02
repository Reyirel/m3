/**
 * utils/imageData.js
 * Preparación de fotos antes de enviarlas (chat y reportes).
 *
 * Una foto de celular pesa varios MB. Reducirla antes de subirla hace el envío
 * rápido con mala señal y permite guardarla en el dispositivo cuando no hay conexión.
 */

import * as ImageManipulator from 'expo-image-manipulator';

// Lado mayor en píxeles y calidad JPEG: suficiente para evidencia, ~100-250 KB por foto
const DEFAULT_MAX_SIZE = 1280;
const DEFAULT_QUALITY = 0.6;

/**
 * Reduce una imagen. Si no se puede procesar, devuelve la original.
 * @param {string} uri - URI local de la imagen
 * @returns {Promise<string>} URI de la imagen reducida
 */
export async function compressImage(uri, { maxSize = DEFAULT_MAX_SIZE, quality = DEFAULT_QUALITY } = {}) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxSize } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (_e) {
    return uri;
  }
}

/**
 * Convierte una URI local en data URL (texto base64).
 * Una URI `blob:` del navegador deja de existir al recargar la página; el data URL
 * sí se puede guardar en el dispositivo para enviarlo después.
 * @param {string} uri
 * @returns {Promise<string|null>} data URL, o null si no se pudo leer
 */
export async function uriToDataUrl(uri) {
  if (!uri) return null;
  if (uri.startsWith('data:')) return uri;
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (_e) {
    return null;
  }
}

/**
 * Convierte un data URL en Blob para subirlo a Storage
 * @param {string} dataUrl
 * @returns {Blob|null}
 */
export function dataUrlToBlob(dataUrl) {
  try {
    const [header, base64] = dataUrl.split(',');
    const mime = (header.match(/data:(.*?);/) || [])[1] || 'image/jpeg';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch (_e) {
    return null;
  }
}

/**
 * Reduce la foto y la deja lista para enviar o guardar sin conexión
 * @param {string} uri - URI que devolvió la cámara o la galería
 * @returns {Promise<{uri: string, dataUrl: string|null}>}
 */
export async function prepareImage(uri, options) {
  const compressedUri = await compressImage(uri, options);
  const dataUrl = await uriToDataUrl(compressedUri);
  return { uri: compressedUri, dataUrl };
}
