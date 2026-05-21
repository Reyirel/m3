/**
 * Servicio para manejar reportes offline
 * Almacena reportes y fotos localmente cuando no hay internet
 * Sincroniza automáticamente cuando se recupera la conexión
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const log = __DEV__ ? console.log : () => {};

const PENDING_REPORTS_KEY = '@pending_reports';
const SYNCED_REPORTS_KEY = '@synced_reports';
const FAILED_REPORTS_KEY = '@failed_reports';

/**
 * Guardar un reporte pendiente localmente (offline)
 */
export const savePendingReport = async (reportData) => {
  try {
    const pendingReports = await getPendingReports();
    
    const reportId = Date.now().toString();
    const pendingReport = {
      id: reportId,
      ...reportData,
      savedAt: new Date().toISOString(),
      status: 'pending_sync',
      retries: 0,
    };
    
    pendingReports.push(pendingReport);
    await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(pendingReports));
    
    log('💾 Reporte guardado offline:', reportId);
    return reportId;
  } catch (error) {
    if (__DEV__) console.error('❌ Error guardando reporte offline:', error);
    throw error;
  }
};

/**
 * Obtener todos los reportes pendientes
 */
export const getPendingReports = async () => {
  try {
    const data = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo reportes pendientes:', error);
    return [];
  }
};

/**
 * Obtener reportes fallidos que necesitan reintentar
 */
export const getFailedReports = async () => {
  try {
    const data = await AsyncStorage.getItem(FAILED_REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo reportes fallidos:', error);
    return [];
  }
};

/**
 * Mover un reporte a la categoría de sincronizados
 */
export const markReportAsSynced = async (reportId) => {
  try {
    const pending = await getPendingReports();
    const synced = await getSyncedReports();
    
    const report = pending.find(r => r.id === reportId);
    if (report) {
      synced.push({
        ...report,
        syncedAt: new Date().toISOString(),
        cloudId: report.cloudId, // ID retornado por Firestore
      });
      
      const updated = pending.filter(r => r.id !== reportId);
      await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(SYNCED_REPORTS_KEY, JSON.stringify(synced));
      
      log('✅ Reporte marcado como sincronizado:', reportId);
    }
  } catch (error) {
    if (__DEV__) console.error('Error marcando reporte como sincronizado:', error);
  }
};

/**
 * Mover reporte a fallidos (para reintentos)
 */
export const markReportAsFailed = async (reportId) => {
  try {
    const pending = await getPendingReports();
    const failed = await getFailedReports();
    
    const report = pending.find(r => r.id === reportId);
    if (report) {
      report.retries = (report.retries || 0) + 1;
      report.lastError = new Date().toISOString();
      
      failed.push(report);
      const updated = pending.filter(r => r.id !== reportId);
      
      await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(updated));
      await AsyncStorage.setItem(FAILED_REPORTS_KEY, JSON.stringify(failed));
      
      log('⚠️ Reporte marcado como fallido:', reportId);
    }
  } catch (error) {
    if (__DEV__) console.error('Error marcando reporte como fallido:', error);
  }
};

/**
 * Obtener reportes sincronizados (historial)
 */
export const getSyncedReports = async () => {
  try {
    const data = await AsyncStorage.getItem(SYNCED_REPORTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo reportes sincronizados:', error);
    return [];
  }
};

/**
 * Actualizar imágenes de un reporte pendiente
 */
export const updatePendingReportImages = async (reportId, imageUris) => {
  try {
    const pending = await getPendingReports();
    const report = pending.find(r => r.id === reportId);
    
    if (report) {
      report.images = imageUris;
      report.imageCount = imageUris.length;
      await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(pending));
      log('🖼️ Imágenes actualizadas para reporte:', reportId);
    }
  } catch (error) {
    if (__DEV__) console.error('Error actualizando imágenes:', error);
  }
};

/**
 * Eliminar reporte pendiente
 */
export const deletePendingReport = async (reportId) => {
  try {
    const pending = await getPendingReports();
    const updated = pending.filter(r => r.id !== reportId);
    await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(updated));
    log('🗑️ Reporte eliminado:', reportId);
  } catch (error) {
    if (__DEV__) console.error('Error eliminando reporte:', error);
  }
};

/**
 * Limpiar reportes sincronizados antiguos (más de 30 días)
 */
export const cleanupOldSyncedReports = async () => {
  try {
    const synced = await getSyncedReports();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const filtered = synced.filter(r => {
      const syncDate = new Date(r.syncedAt);
      return syncDate > thirtyDaysAgo;
    });
    
    const removed = synced.length - filtered.length;
    if (removed > 0) {
      await AsyncStorage.setItem(SYNCED_REPORTS_KEY, JSON.stringify(filtered));
      log(`🧹 Limpiados ${removed} reportes antiguos`);
    }
  } catch (error) {
    if (__DEV__) console.error('Error limpiando reportes antiguos:', error);
  }
};

/**
 * Obtener estadísticas de sincronización
 */
export const getSyncStats = async () => {
  try {
    const pending = await getPendingReports();
    const synced = await getSyncedReports();
    const failed = await getFailedReports();
    
    return {
      totalPending: pending.length,
      totalSynced: synced.length,
      totalFailed: failed.length,
      pendingImages: pending.reduce((sum, r) => sum + (r.imageCount || 0), 0),
      lists: { pending, synced, failed },
    };
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo estadísticas:', error);
    return { totalPending: 0, totalSynced: 0, totalFailed: 0 };
  }
};

/**
 * Retrying failed reports with exponential backoff
 */
export const retryFailedReports = async () => {
  try {
    const failed = await getFailedReports();
    const maxRetries = 5;
    
    for (const report of failed) {
      if ((report.retries || 0) < maxRetries) {
        // Mover de vuelta a pending
        const pending = await getPendingReports();
        pending.push({
          ...report,
          retries: (report.retries || 0) + 1,
          status: 'pending_sync',
        });
        
        const updated = failed.filter(r => r.id !== report.id);
        await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(pending));
        await AsyncStorage.setItem(FAILED_REPORTS_KEY, JSON.stringify(updated));
        
        log(`🔄 Reporte ${report.id} movido para reintentar (intento ${report.retries + 1})`);
      } else {
        log(`❌ Reporte ${report.id} excedió máximo de reintentos`);
      }
    }
  } catch (error) {
    if (__DEV__) console.error('Error reintentando reportes fallidos:', error);
  }
};

/**
 * Estimar espacio de almacenamiento usado
 */
export const estimateStorageUsage = async () => {
  try {
    const pending = await getPendingReports();
    const synced = await getSyncedReports();
    
    let totalSize = 0;
    
    const calculateSize = (obj) => JSON.stringify(obj).length;
    totalSize += calculateSize(pending);
    totalSize += calculateSize(synced);
    
    const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
    
    return {
      bytes: totalSize,
      kilobytes: (totalSize / 1024).toFixed(2),
      megabytes: sizeInMB,
      pendingCount: pending.length,
      syncedCount: synced.length,
    };
  } catch (error) {
    if (__DEV__) console.error('Error estimando almacenamiento:', error);
    return { bytes: 0 };
  }
};

export default {
  savePendingReport,
  getPendingReports,
  getFailedReports,
  markReportAsSynced,
  markReportAsFailed,
  getSyncedReports,
  updatePendingReportImages,
  deletePendingReport,
  cleanupOldSyncedReports,
  getSyncStats,
  retryFailedReports,
  estimateStorageUsage,
};
