/**
 * Gestor de cache con auto-limpieza
 * Previene que AsyncStorage crezca indefinidamente
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'cache_';
const CACHE_METADATA = 'cache_metadata';
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB en bytes estimados
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Cada 1 hora

let cleanupTimer = null;
const cacheSizes = {}; // Track approximate sizes

/**
 * Remover item del cache
 * @param {string} key - Clave
 */
export const removeCacheItem = async (key) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await AsyncStorage.removeItem(cacheKey);
    delete cacheSizes[key];

    // Remover metadata
    const allMetadata = await getAllCacheMetadata();
    delete allMetadata[key];
    await AsyncStorage.setItem(CACHE_METADATA, JSON.stringify(allMetadata));

    return true;
  } catch (error) {
    console.error('Error removing cache item:', error);
    return false;
  }
};

/**
 * Limpiar cache expirado y reducir tamaño si es necesario
 */
export const cleanupIfNeeded = async () => {
  try {
    let totalSize = Object.values(cacheSizes).reduce((a, b) => a + b, 0);

    // Si supera límite, remover items más viejos
    if (totalSize > MAX_CACHE_SIZE) {
      const metadata = await getAllCacheMetadata();
      const items = Object.entries(metadata)
        .map(([key, meta]) => ({ key, ...meta }))
        .sort((a, b) => a.createdAt - b.createdAt); // Más viejos primero

      // Remover ~20% del cache
      const toRemove = Math.ceil(items.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        await removeCacheItem(items[i].key);
      }

      console.log(`Cleaned up ${toRemove} old cache items`);
    }

    // Remover items expirados
    const now = Date.now();
    const metadata = await getAllCacheMetadata();
    let removedCount = 0;

    for (const [key, meta] of Object.entries(metadata)) {
      if (now > meta.expiresAt) {
        await removeCacheItem(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Removed ${removedCount} expired cache items`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Helpers
const getAllCacheMetadata = async () => {
  try {
    const data = await AsyncStorage.getItem(CACHE_METADATA);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
};

/**
 * Iniciar limpieza automática periódica
 * Llamar una sola vez en App.js
 */
export const startAutoCacheCleanup = () => {
  if (cleanupTimer) return; // Ya iniciado

  cleanupTimer = setInterval(async () => {
    await cleanupIfNeeded();
  }, CLEANUP_INTERVAL);

  console.log('Auto cache cleanup started');
};

/**
 * Detener limpieza automática
 */
export const stopAutoCacheCleanup = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
};
