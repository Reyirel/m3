/**
 * Ejemplo de integración de sincronización offline en App.js
 * 
 * PASOS:
 * 1. Copiar este código en tu App.js
 * 2. Reemplazar las secciones marcadas con [REEMPLAZAR]
 * 3. Testear flujos offline/online
 */

import React, { useEffect } from 'react';
import { useOfflineReportsSync } from '../hooks/useOfflineReportsSync';
import { cleanupOldSyncedReports } from './offlineReportsService';

/**
 * OPCIÓN 1: Hook para agregar al componente principal de App
 *
 * En tu App.js: useSetupOfflineSync()
 */
export const useSetupOfflineSync = () => {
  useEffect(() => {
    const initializeSync = async () => {
      if (__DEV__) console.log('🚀 Inicializando sincronización offline...');

      // Limpiar reportes sincronizados antiguos al iniciar
      await cleanupOldSyncedReports();
      if (__DEV__) console.log('✅ Limpieza de antiguos reportes completada');
    };

    initializeSync();
  }, []);
};

/** @deprecated Usar useSetupOfflineSync() en su lugar */
export const setupOfflineSync = useSetupOfflineSync;

/**
 * OPCIÓN 2: Crear un componente wrapper
 * 
 * Envolver tu app principal con este componente
 */
export function OfflineReportsSyncProvider({ children }) {
  const {
    manualSync,
    hasPendingReports,
    isOnline,
  } = useOfflineReportsSync();

  // Limpiar al iniciar
  useEffect(() => {
    const init = async () => {
      await cleanupOldSyncedReports();
      if (__DEV__) console.log('🧹 Inicialización completada');
    };
    init();
  }, []);

  // Sincronización periódica cada 30 segundos si hay pendientes
  useEffect(() => {
    if (!hasPendingReports || !isOnline) {
      return;
    }

    if (__DEV__) console.log('⏰ Iniciando sincronización periódica...');
    const interval = setInterval(async () => {
      try {
        await manualSync();
      } catch (error) {
        if (__DEV__) console.error('Error en sincronización periódica:', error);
      }
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [hasPendingReports, isOnline, manualSync]);

  return children;
}

/**
 * OPCIÓN 3: Hook personalizado para tu app
 * 
 * Crear un hook que encapsule toda la lógica
 */
export const useAppOfflineSync = () => {
  const {
    syncStats,
    isSyncing,
    syncProgress,
    isOnline,
    manualSync,
    hasPendingReports,
    hasFailedReports,
  } = useOfflineReportsSync();

  useEffect(() => {
    // Limpiar antiguos al iniciar
    cleanupOldSyncedReports().catch(console.error);
  }, []);

  // Auto-sync cada 30s
  useEffect(() => {
    if (!hasPendingReports || !isOnline) return;

    const interval = setInterval(() => {
      manualSync().catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, [hasPendingReports, isOnline, manualSync]);

  return {
    // Estado
    totalPending: syncStats.totalPending,
    totalSynced: syncStats.totalSynced,
    totalFailed: syncStats.totalFailed,
    isSyncing,
    syncProgress,
    isOnline,
    
    // Acciones
    manualSync,
    
    // Indicadores
    hasPendingReports,
    hasFailedReports,
    
    // Información
    syncMessage: getSyncMessage(syncStats, isSyncing, isOnline),
  };
};

/**
 * Helper para obtener mensaje de estado
 */
function getSyncMessage(stats, isSyncing, isOnline) {
  if (isSyncing) {
    return `Sincronizando ${stats.totalPending} reporte(s)...`;
  } else if (!isOnline) {
    return `📶 Sin conexión. ${stats.totalPending} reporte(s) en espera.`;
  } else if (stats.totalFailed > 0) {
    return `⚠️ ${stats.totalFailed} reporte(s) con error. Tap para reintentar.`;
  } else if (stats.totalPending > 0) {
    return `📤 ${stats.totalPending} reporte(s) pendiente(s)`;
  }
  return '';
}

/**
 * ============================================================================
 * EJEMPLO DE USO EN Tu App.js
 * ============================================================================
 * 
 * Importa OfflineReportsSyncProvider y envuelve tu app:
 * 
 * import { OfflineReportsSyncProvider } from './services/appOfflineSync';
 * 
 * export default function App() {
 *   return (
 *     <OfflineReportsSyncProvider>
 *       <Navigation />
 *     </OfflineReportsSyncProvider>
 *   );
 * }
 */

/**
 * ============================================================================
 * EJEMPLO DE USO EN HomeScreen.js
 * ============================================================================
 * 
 * import { useAppOfflineSync } from '../services/appOfflineSync';
 * import OfflineSyncIndicator from '../components/OfflineSyncIndicator';
 * 
 * export default function HomeScreen() {
 *   const { totalPending, isOnline, hasPendingReports } = useAppOfflineSync();
 *   
 *   return (
 *     <View>
 *       {hasPendingReports && <OfflineSyncIndicator compact={true} />}
 *     </View>
 *   );
 * }
 */

/**
 * ============================================================================
 * TESTING DEBUG
 * ============================================================================
 */

// Script de debugging para consola
export const debugOfflineReports = async () => {
  const {
    getPendingReports,
    getSyncStats,
    estimateStorageUsage,
  } = await import('./offlineReportsService');

  const pending = await getPendingReports();
  const stats = await getSyncStats();
  const storage = await estimateStorageUsage();

  if (__DEV__) console.table({
    'Reportes Pendientes': stats.totalPending,
    'Reportes Sincronizados': stats.totalSynced,
    'Reportes con Error': stats.totalFailed,
    'Imágenes Pendientes': stats.pendingImages,
    'Almacenamiento (MB)': storage.megabytes,
    'Almacenamiento (%)': `${((parseFloat(storage.megabytes) / 10) * 100).toFixed(1)}%`,
  });

  if (__DEV__) console.log('📋 Detalles:', {
    pending,
    stats,
    storage,
  });
};

// Para usar en DevScreen o en consola de React Native:
// debugOfflineReports()

export default {
  setupOfflineSync,
  OfflineReportsSyncProvider,
  useAppOfflineSync,
};
