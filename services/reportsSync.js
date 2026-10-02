/**
 * Servicio de Sincronización de Reportes Offline
 * Maneja el envío de reportes guardados localmente
 */
import { createTaskReport, uploadReportImage } from './reportsService';
import { getCurrentSession } from './authFirestore';
import {
  getPendingReports,
  markReportAsSynced,
  markReportAsFailed,
  retryFailedReports,
  updatePendingReport,
} from './offlineReportsService';

/**
 * Sincronizar un reporte pendiente
 */
export const syncPendingReport = async (pendingReport) => {
  try {
    
    const session = await getCurrentSession();
    if (!session.success || !session.session) {
      throw new Error('No hay sesión activa para sincronizar');
    }

    const userId = session.session.userId;

    // 1. Crear reporte en Firestore — solo si no se creó en un intento anterior.
    // El ID se guarda de inmediato: si luego falla una foto, el reintento NO crea
    // un segundo reporte, solo sube lo que falta.
    let cloudReportId = pendingReport.cloudId;
    if (!cloudReportId) {
      cloudReportId = await createTaskReport(pendingReport.taskId, userId, {
        title: pendingReport.title,
        description: pendingReport.description,
        rating: pendingReport.rating || null,
        ratingComment: pendingReport.ratingComment || '',
        images: [],
      });
      await updatePendingReport(pendingReport.id, { cloudId: cloudReportId });
    }

    // 2. Subir imágenes; las que fallen se quedan en el reporte pendiente para reintentar
    const images = pendingReport.images || [];
    const remaining = [];
    for (let idx = 0; idx < images.length; idx++) {
      const image = images[idx];
      // Las fotos se guardan como data URL; versiones anteriores guardaban solo la URI
      const isDataUrl = typeof image === 'string' && image.startsWith('data:');
      try {
        await uploadReportImage(pendingReport.taskId, cloudReportId, {
          uri: isDataUrl ? null : image,
          dataUrl: isDataUrl ? image : null,
          uploadedBy: userId,
        });
      } catch (imgError) {
        if (__DEV__) console.error(`⚠️ Error en imagen ${idx + 1}:`, imgError);
        remaining.push(image);
      }
    }

    if (remaining.length > 0) {
      await updatePendingReport(pendingReport.id, { images: remaining, imageCount: remaining.length });
      throw new Error(`${remaining.length} foto(s) no se pudieron subir`);
    }

    // 3. Marcar como sincronizado
    await markReportAsSynced(pendingReport.id);

    return {
      success: true,
      localId: pendingReport.id,
      cloudId: cloudReportId,
    };

  } catch (error) {
    if (__DEV__) console.error('❌ Error sincronizando reporte:', error);
    await markReportAsFailed(pendingReport.id);
    throw error;
  }
};

/**
 * Sincronizar TODOS los reportes pendientes
 * Retorna { success: number, failed: number, errors: [] }
 */
export const syncAllPendingReports = async (onProgress = null) => {
  try {
    // Los reportes que fallaron antes vuelven a la lista de pendientes (hasta su máximo de reintentos)
    await retryFailedReports();
    const pending = await getPendingReports();
    
    if (pending.length === 0) {
      return { success: 0, failed: 0, errors: [] };
    }

    
    let successCount = 0;
    let failedCount = 0;
    const errors = [];

    for (let idx = 0; idx < pending.length; idx++) {
      const report = pending[idx];
      
      try {
        // Notificar progreso
        if (onProgress) {
          onProgress({
            current: idx + 1,
            total: pending.length,
            status: 'syncing',
            report: report,
          });
        }

        // Sincronizar
        await syncPendingReport(report);
        successCount++;

        if (onProgress) {
          onProgress({
            current: idx + 1,
            total: pending.length,
            status: 'synced',
            report: report,
          });
        }

      } catch (error) {
        failedCount++;
        errors.push({
          reportId: report.id,
          error: error.message,
        });
        if (__DEV__) console.error(`❌ Error en reporte ${report.id}:`, error);

        if (onProgress) {
          onProgress({
            current: idx + 1,
            total: pending.length,
            status: 'error',
            report: report,
            error: error.message,
          });
        }
      }

      // Pequeño delay para evitar sobrecargar backend
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    
    return {
      success: successCount,
      failed: failedCount,
      errors,
    };

  } catch (error) {
    if (__DEV__) console.error('❌ Error en sincronización masiva:', error);
    return {
      success: 0,
      failed: 0,
      errors: [{ error: error.message }],
    };
  }
};

/**
 * Verificar y sincronizar reportes pendientes en background
 * Se puede ejecutar periódicamente o cuando se detecte conexión
 */
export const checkAndSyncPendingReports = async () => {
  try {
    const pending = await getPendingReports();
    
    if (pending.length === 0) {
      return { hasPending: false };
    }

    // Intentar sincronizar silenciosamente
    const result = await syncAllPendingReports();
    
    return {
      hasPending: pending.length > 0,
      synced: result.success,
      failed: result.failed,
    };

  } catch (error) {
    if (__DEV__) console.error('Error verificando reportes pendientes:', error);
    return { hasPending: false, error: error.message };
  }
};

/**
 * Limpiar reportes que fallaron muchas veces
 */
export const cleanupFailedReports = async (_maxAge = 7) => {
  try {
    await retryFailedReports();
  } catch (error) {
    if (__DEV__) console.error('Error limpiando reportes fallidos:', error);
  }
};

export default {
  syncPendingReport,
  syncAllPendingReports,
  checkAndSyncPendingReports,
  cleanupFailedReports,
};
