/**
 * Hook para manejar sincronización de reportes offline
 * - Detecta cambios en la conexión
 * - Sincroniza automáticamente cuando hay internet
 * - Mantiene estado de reportes pendientes
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncAllPendingReports } from '../services/reportsSync';
import { getSyncStats } from '../services/offlineReportsService';

export const useOfflineReportsSync = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [syncStats, setSyncStats] = useState({
    totalPending: 0,
    totalSynced: 0,
    totalFailed: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const syncingRef = useRef(false);

  // Cargar estadísticas iniciales
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await getSyncStats();
        setSyncStats({
          totalPending: stats.totalPending,
          totalSynced: stats.totalSynced,
          totalFailed: stats.totalFailed,
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      }
    };

    loadStats();

    // Actualizar cada 5 segundos
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const performSync = useCallback(async () => {
    // Usar ref para evitar carreras
    if (syncingRef.current) return;
    syncingRef.current = true;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Callback para actualizar progreso
      const onProgress = (progress) => {
        setSyncProgress(progress);
        console.log(
          `📊 Progreso: ${progress.current}/${progress.total} - ${progress.status}`
        );
      };

      const result = await syncAllPendingReports(onProgress);

      setLastSyncTime(new Date());
      setSyncProgress(null);

      // Actualizar estadísticas
      const stats = await getSyncStats();
      setSyncStats({
        totalPending: stats.totalPending,
        totalSynced: stats.totalSynced,
        totalFailed: stats.totalFailed,
      });

      if (result.failed > 0) {
        setSyncError(`${result.failed} reporte(s) no se pudieron sincronizar`);
      }

      console.log(`✅ Sincronización completada: ${result.success} éxito(s), ${result.failed} fallo(s)`);
      return result;

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      setSyncError(error.message);
      throw error;
    } finally {
      setIsSyncing(false);
      syncingRef.current = false;
    }
  }, []);

  // Monitorear conexión
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = isConnected;
      const nowConnected = state.isConnected === true;

      setIsConnected(nowConnected);

      // Si recuperó conexión, sincronizar
      if (!wasConnected && nowConnected) {
        console.log('🌐 Conexión recuperada, sincronizando reportes pendientes...');
        performSync();
      }
    });

    // También sincronizar al cargar
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected === true);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para sincronizar manualmente
  const manualSync = useCallback(async () => {
    return performSync();
  }, [performSync]);

  return {
    // Estado
    syncStats,
    isSyncing,
    syncProgress,
    lastSyncTime,
    syncError,
    isOnline: isConnected,

    // Acciones
    manualSync,

    // Información
    hasPendingReports: syncStats.totalPending > 0,
    hasFailedReports: syncStats.totalFailed > 0,
  };
};

export default useOfflineReportsSync;
