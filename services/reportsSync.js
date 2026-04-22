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

    // 1. Crear reporte en Firestore
    const cloudReportId = await createTaskReport(pendingReport.taskId, userId, {
      title: pendingReport.title,
      description: pendingReport.description,
      rating: pendingReport.rating || null,
      ratingComment: pendingReport.ratingComment || '',
      images: [],
    });


    // 2. Subir imágenes si existen
    if (pendingReport.images && pendingReport.images.length > 0) {
      
      for (let idx = 0; idx < pendingReport.images.length; idx++) {
        const imageUri = pendingReport.images[idx];
        try {
          // Convertir a base64
          let base64Data = null;
          try {
            const response = await fetch(imageUri);
            const blob = await response.blob();
            base64Data = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          } catch (convError) {
            console.warn('⚠️ No se pudo convertir imagen a base64:', convError);
          }

          // Subir
          await uploadReportImage(pendingReport.taskId, cloudReportId, {
            uri: imageUri,
            base64: base64Data ? base64Data.split(',')[1] : null,
            dataUrl: base64Data,
            uploadedBy: userId,
          });

        } catch (imgError) {
          console.error(`⚠️ Error en imagen ${idx + 1}:`, imgError);
          // Continuar con las siguientes imágenes
        }
      }
    }

    // 3. Marcar como sincronizado
    await markReportAsSynced(pendingReport.id);
    
    return {
      success: true,
      localId: pendingReport.id,
      cloudId: cloudReportId,
    };

  } catch (error) {
    console.error('❌ Error sincronizando reporte:', error);
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
        console.error(`❌ Error en reporte ${report.id}:`, error);

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
    console.error('❌ Error en sincronización masiva:', error);
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
    console.error('Error verificando reportes pendientes:', error);
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
    console.error('Error limpiando reportes fallidos:', error);
  }
};

export default {
  syncPendingReport,
  syncAllPendingReports,
  checkAndSyncPendingReports,
  cleanupFailedReports,
};
