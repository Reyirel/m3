// services/ReportsExport.js
// Utilidad para exportar reportes a CSV, con soporte para datos grandes
// Optimizado para no bloquear el thread principal
// Compatible con Web, iOS y Android

import { Platform } from 'react-native';
import { toMs } from '../utils/dateUtils';

// Imports condicionales para Expo modules (no disponibles en web)
let FileSystem = null;
let Sharing = null;

if (Platform.OS !== 'web') {
  try {
    FileSystem = require('expo-file-system');
    Sharing = require('expo-sharing');
  } catch (e) {
    if (__DEV__) console.warn('Expo modules not available');
  }
}

/**
 * Descarga CSV en Web usando blob
 */
function downloadCSVWeb(csvContent, filename) {
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    if (__DEV__) console.error('Error downloading CSV:', error);
    return false;
  }
}

/**
 * Genera CSV desde datos
 * Optimizado: Chunks grandes de 50MB
 */
function generateCSV(headers, rows) {
  const csvHeaders = headers.map(h => `"${h}"`).join(',');
  const csvRows = rows.map(row => 
    row.map(cell => {
      const str = String(cell || '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Exportar reporte completo de áreas
 * @param {Object} areaMetrics - Datos de métricas por área
 * @param {Array} allTasks - Todas las tareas
 * @param {String} period - 'week' | 'month' | 'quarter'
 */
export async function exportAreaReport(areaMetrics, allTasks, _period = 'month') {
  try {
    const sections = [];

    // SECCIÓN 1: Resumen por Área
    const areaHeaders = ['Área', 'Total', 'Completadas', '% Completación', 'Pendientes', 'Vencidas', 'Tiempo Prom.'];
    const areaRows = Object.entries(areaMetrics).map(([area, metrics]) => [
      area,
      metrics.total || 0,
      metrics.completed || 0,
      `${metrics.completionRate || 0}%`,
      metrics.pending || 0,
      metrics.overdue || 0,
      metrics.avgCompletionTime || 'N/A'
    ]);
    
    sections.push('=== REPORTE POR ÁREA ===\n');
    sections.push(generateCSV(areaHeaders, areaRows));
    sections.push('\n\n');

    // SECCIÓN 2: Detalles de tareas vencidas
    const overdueHeaders = ['ID', 'Título', 'Área', 'Asignado', 'Fecha Vencimiento', 'Días Retrasado'];
    const now = Date.now();
    const overdueRows = allTasks
      .filter(t => t.dueAt && toMs(t.dueAt) < now && t.status !== 'cerrada')
      .map(t => [
        t.id.substring(0, 8),
        t.title,
        t.area || 'N/A',
        t.assignedToNames?.join('; ') || 'No asignado',
        new Date(toMs(t.dueAt)).toLocaleDateString('es-MX'),
        Math.floor((now - toMs(t.dueAt)) / (1000 * 60 * 60 * 24))
      ])
      .sort((a, b) => b[5] - a[5]) // Ordenar por días retrasados
      .slice(0, 100); // Max 100 vencidas para no saturar

    if (overdueRows.length > 0) {
      sections.push('=== TAREAS VENCIDAS ===\n');
      sections.push(generateCSV(overdueHeaders, overdueRows));
      sections.push('\n\n');
    }

    // SECCIÓN 3: Distribución por estado
    const statusDistribution = {
      pendiente: allTasks.filter(t => t.status === 'pendiente').length,
      en_proceso: allTasks.filter(t => t.status === 'en_proceso' || t.status === 'en-progreso' || t.status === 'en progreso').length,
      en_revision: allTasks.filter(t => t.status === 'en_revision').length,
      cerrada: allTasks.filter(t => t.status === 'cerrada').length,
    };

    sections.push('=== ESTADÍSTICAS GENERALES ===\n');
    sections.push('Estado,Cantidad\n');
    Object.entries(statusDistribution).forEach(([status, count]) => {
      sections.push(`${status},${count}\n`);
    });
    sections.push(`Total,${allTasks.length}\n`);

    const csvContent = sections.join('');
    
    // Nombre del archivo
    const filename = `Reporte-Areas-${new Date().toISOString().split('T')[0]}.csv`;
    
    // En Web, descargar directamente
    if (Platform.OS === 'web') {
      const success = downloadCSVWeb(csvContent, filename);
      return { success, filename };
    }
    
    // En móvil, usar FileSystem y Sharing
    if (!FileSystem || !Sharing) {
      return { success: false, error: 'Módulos de exportación no disponibles' };
    }
    
    const filePath = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Compartir
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Guardar Reporte'
      });
    }

    return { success: true, filename };
  } catch (error) {
    if (__DEV__) console.error('Error exportando reporte:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Exportar vista de heatmap/productividad
 * @param {Array} heatmapData - Datos de actividad
 */
export async function exportProductivityReport(heatmapData, user = 'usuario') {
  try {
    const headers = ['Fecha', 'Hora', 'Tareas Completadas', 'Tiempo Invertido'];
    const rows = heatmapData.map(item => [
      new Date(item.date).toLocaleDateString('es-MX'),
      item.hour || item.period,
      item.completed || 0,
      item.timeInvested || 'N/A'
    ]);

    const csvContent = generateCSV(headers, rows);
    const filename = `Productividad-${user}-${new Date().toISOString().split('T')[0]}.csv`;

    // En Web, descargar directamente
    if (Platform.OS === 'web') {
      const success = downloadCSVWeb(csvContent, filename);
      return { success, filename };
    }

    // En móvil
    if (!FileSystem || !Sharing) {
      return { success: false, error: 'Módulos de exportación no disponibles' };
    }

    const filePath = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(filePath, csvContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath);
    }

    return { success: true, filename };
  } catch (error) {
    if (__DEV__) console.error('Error exportando productividad:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generar JSON para análisis externo
 * @param {Object} data - Datos a exportar
 */
export async function exportToJSON(data, reportName = 'reporte') {
  try {
    const filename = `${reportName}-${new Date().toISOString().split('T')[0]}.json`;
    const jsonContent = JSON.stringify(data, null, 2);
    
    // En Web, descargar directamente
    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return { success: true, filename };
      } catch (e) {
        return { success: false, error: e.message };
      }
    }

    // En móvil
    if (!FileSystem || !Sharing) {
      return { success: false, error: 'Módulos de exportación no disponibles' };
    }

    const filePath = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.writeAsStringAsync(filePath, jsonContent, {
      encoding: FileSystem.EncodingType.UTF8
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath);
    }

    return { success: true, filename };
  } catch (error) {
    if (__DEV__) console.error('Error exportando JSON:', error);
    return { success: false, error: error.message };
  }
}
