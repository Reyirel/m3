// Service para exportar reportes a PDF con fotos

import { statusLabel } from '../utils/taskStatus';
import { toMs } from '../utils/dateUtils';

const log = __DEV__ ? console.log : () => {};

// Imports condicionales para expo modules
let Print = null;
let Sharing = null;

try {
  Print = require('expo-print');
} catch (e) {
  // expo-print no disponible (web)
}

try {
  Sharing = require('expo-sharing');
} catch (e) {
  // expo-sharing no disponible (web)
}

// El reporte se arma con texto que escriben los usuarios (títulos, descripciones,
// comentarios). Sin esto, un título con etiquetas HTML se interpretaba como código.
export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Solo se aceptan fotos por https o guardadas dentro del reporte (data:image)
const safeImageUrl = (url) =>
  (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('data:image/')) ? escapeHtml(url) : '');

// Helper para descargar PDF en web
const downloadPDFWeb = (html, fileName) => {
  return new Promise((resolve, reject) => {
    try {
      // Crear un blob y descargarlo
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      resolve({ uri: url, fileName: `${fileName}.html` });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate HTML para reporte
 * @param {Object} report - Report data
 * @param {Array} images - Array of image URLs
 * @param {Object} task - Task data
 * @returns {string} HTML string
 */
const generateReportHTML = (report, images = [], task = {}) => {
  const formatDate = (timestamp) => {
    // Acepta Timestamp de Firestore, Date, milisegundos o texto ISO (las fotos guardan texto)
    const ms = toMs(timestamp);
    if (!ms) return 'N/A';
    const date = new Date(ms);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRatingStars = (rating) => {
    const stars = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
    return '⭐'.repeat(stars);
  };

  const imagesHTML = images && images.length > 0
    ? `
    <div style="page-break-inside: avoid; margin-top: 20px;">
      <h3 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
        📸 Fotos Adjuntas (${images.length})
      </h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
        ${images.map((img, idx) => `
          <div style="text-align: center;">
            <img 
              src="${safeImageUrl(img.url)}"
              style="max-width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;"
              alt="Foto ${idx + 1}"
            />
            <p style="font-size: 11px; color: #666; margin-top: 5px;">
              ${img.uploadedAt ? formatDate(img.uploadedAt) : 'Fecha desconocida'}
            </p>
          </div>
        `).join('')}
      </div>
    </div>
    `
    : '';

  const ratingHTML = report.rating
    ? `
    <div style="background-color: #fff3e0; padding: 12px; border-radius: 6px; margin-top: 15px; border-left: 4px solid #ff9800;">
      <p style="margin: 0; font-size: 13px; color: #333;">
        <strong>Calificación de Calidad:</strong> ${getRatingStars(report.rating)} (${escapeHtml(report.rating)}/5)
      </p>
      ${report.ratingComment ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #555; font-style: italic;">${escapeHtml(report.ratingComment)}</p>` : ''}
    </div>
    `
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background-color: white;
        }
        .header {
          background: linear-gradient(135deg, #9F2241 0%, #7D1A33 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
        }
        .header p {
          font-size: 14px;
          opacity: 0.9;
        }
        .info-section {
          margin-bottom: 20px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 6px;
          border-left: 4px solid #9F2241;
        }
        .info-section h2 {
          font-size: 16px;
          color: #9F2241;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 13px;
        }
        .info-label {
          font-weight: 600;
          color: #666;
        }
        .info-value {
          color: #333;
        }
        .description {
          background-color: #fafafa;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
          font-size: 13px;
          line-height: 1.8;
          border: 1px solid #eee;
        }
        .rating-box {
          background-color: #fff3e0;
          padding: 15px;
          border-radius: 6px;
          margin-top: 15px;
          border-left: 4px solid #ff9800;
        }
        .photos-section {
          margin-top: 30px;
          page-break-inside: avoid;
        }
        .photos-section h3 {
          color: #333;
          border-bottom: 2px solid #ddd;
          padding-bottom: 10px;
          margin-bottom: 15px;
          font-size: 16px;
        }
        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
        }
        .photo-item {
          text-align: center;
        }
        .photo-item img {
          max-width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #ddd;
          display: block;
        }
        .photo-date {
          font-size: 11px;
          color: #999;
          margin-top: 5px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #eee;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
        @media print {
          body {
            background-color: white;
          }
          .container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Reporte de Tarea</h1>
          <p>Documentación de completación con evidencia</p>
        </div>

        <div class="info-section">
          <h2>ℹ️ Información de Tarea</h2>
          <div class="info-row">
            <span class="info-label">Título:</span>
            <span class="info-value">${escapeHtml(task.title || task.titulo || 'N/A')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Área:</span>
            <span class="info-value">${escapeHtml(task.area || 'N/A')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Prioridad:</span>
            <span class="info-value">${escapeHtml(task.priority || task.prioridad || 'N/A')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="info-value">${escapeHtml(task.status ? statusLabel(task.status) : 'N/A')}</span>
          </div>
        </div>

        <div class="info-section">
          <h2>📝 Detalles del Reporte</h2>
          <div class="info-row">
            <span class="info-label">Título del Reporte:</span>
            <span class="info-value">${escapeHtml(report.title || 'Sin título')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha de Envío:</span>
            <span class="info-value">${formatDate(report.createdAt)}</span>
          </div>
          <div class="description">
            <strong>Descripción:</strong><br/><br/>
            ${escapeHtml(report.description || 'Sin descripción').replace(/\n/g, '<br/>')}
          </div>
        </div>

        ${ratingHTML}

        ${imagesHTML}

        <div class="footer">
          <p>Este documento fue generado automáticamente el ${formatDate(new Date())}</p>
          <p>Sistema de Gestión de Tareas | Municipalidad</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
};

/**
 * Export single report to PDF
 * @param {Object} report - Report data
 * @param {Array} images - Images
 * @param {Object} task - Task data
 * @returns {Promise<string>} PDF file URI
 */
export const exportReportToPDF = async (report, images = [], task = {}) => {
  try {
    const html = generateReportHTML(report, images, task);
    const fileName = `Reporte_${report.title?.replace(/\s+/g, '_')}_${Date.now()}`;

    // Use Print for mobile, downloadPDFWeb for web
    if (Print && Print.printToFileAsync) {
      const pdf = await Print.printToFileAsync({
        html,
        base64: false,
        fileName,
      });
      return pdf.uri;
    } else {
      // Web fallback
      const result = await downloadPDFWeb(html, fileName);
      return result.uri;
    }
  } catch (error) {
    if (__DEV__) console.error('Error exporting report to PDF:', error);
    throw error;
  }
};

/**
 * Share PDF file
 * @param {string} pdfUri - PDF file URI
 * @param {string} fileName - File name for sharing
 * @returns {Promise<void>}
 */
export const sharePDF = async (pdfUri, _fileName = 'Reporte.pdf') => {
  try {
    if (Sharing && Sharing.isAvailableAsync && Sharing.shareAsync) {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir Reporte',
          UTI: 'com.adobe.pdf',
        });
      } else {
        throw new Error('Compartir no disponible en este dispositivo');
      }
    } else {
      // Web: mostrar mensaje informativo
      log('Compartir no disponible en web. El archivo está listo para descargar.');
    }
  } catch (error) {
    if (__DEV__) console.error('Error sharing PDF:', error);
    throw error;
  }
};

/**
 * Get report statistics for export
 * @param {Array} reports - Array of reports
 * @returns {Object} Statistics
 */
export const getReportExportStats = (reports = []) => {
  const total = reports.length;
  const rated = reports.filter(r => r.rating).length;
  const avgRating = rated > 0
    ? (reports.reduce((sum, r) => sum + (r.rating || 0), 0) / rated).toFixed(2)
    : 0;
  const withImages = reports.filter(r => r.images?.length > 0).length;
  const totalImages = reports.reduce((sum, r) => sum + (r.images?.length || 0), 0);

  return {
    total,
    rated,
    avgRating: parseFloat(avgRating),
    withImages,
    totalImages,
  };
};
