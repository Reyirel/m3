import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toMs } from '../utils/dateUtils';
import { getCurrentSession } from './authFirestore';

/**
 * Generar reporte de tareas en formato CSV (compatible con Excel)
 * @param {Object} filters - Filtros para el reporte (status, priority, department, dateRange)
 * @returns {Promise<string>} - Path del archivo generado
 */
export const generateTaskReport = async (filters = {}) => {
  try {
    // En web, usar descarga HTML
    if (Platform.OS === 'web') {
      return await generateWebReport(filters);
    }
    
    // Obtener sesión del usuario
    const session = await getCurrentSession();
    if (!session.success) {
      throw new Error('Usuario no autenticado');
    }

    // Construir consulta según filtros
    let q = collection(db, 'tasks');
    const constraints = [];

    // Filtros adicionales
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.priority) {
      constraints.push(where('priority', '==', filters.priority));
    }
    if (filters.area) {
      constraints.push(where('area', '==', filters.area));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    // Obtener tareas
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (tasks.length === 0) {
      throw new Error('No hay tareas para exportar con los filtros seleccionados');
    }

    // Generar CSV
    const csv = generateCSV(tasks);

    // Guardar archivo
    const fileName = `reporte_tareas_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, csv, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Compartir archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Reporte de Tareas'
      });
    }

    return filePath;
  } catch (error) {
    if (__DEV__) console.error('Error generando reporte:', error);
    throw error;
  }
};

/**
 * Generar reporte para web usando descarga de blob
 */
async function generateWebReport(filters = {}) {
  try {
    // Construir consulta
    let q = collection(db, 'tasks');
    const constraints = [];

    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.priority) {
      constraints.push(where('priority', '==', filters.priority));
    }
    if (filters.area) {
      constraints.push(where('area', '==', filters.area));
    }

    constraints.push(orderBy('createdAt', 'desc'));
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    // Obtener tareas
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (tasks.length === 0) {
      throw new Error('No hay tareas para exportar');
    }

    // Generar CSV
    const csv = generateCSV(tasks);
    
    // Crear blob y descargar en web
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `reporte_tareas_${new Date().toISOString().split('T')[0]}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return fileName;
  } catch (error) {
    if (__DEV__) console.error('Error generando reporte web:', error);
    throw error;
  }
}

/**
 * Convertir array de tareas a formato CSV
 */
function generateCSV(tasks) {
  // Encabezados
  const headers = [
    'ID',
    'Título',
    'Descripción',
    'Estado',
    'Prioridad',
    'Área',
    'Asignado a',
    'Fecha Creación',
    'Fecha Vencimiento'
  ];

  // Convertir cada tarea a fila CSV
  const rows = tasks.map(task => {
    return [
      task.id,
      escapeCSV(task.title || ''),
      escapeCSV(task.description || ''),
      translateStatus(task.status),
      translatePriority(task.priority),
      task.area || '',
      task.assignedTo || '',
      formatDate(task.createdAt),
      formatDate(task.dueAt)
    ].map(field => `"${field}"`).join(',');
  });

  // Combinar encabezados y filas
  return [
    headers.map(h => `"${h}"`).join(','),
    ...rows
  ].join('\n');
}

/**
 * Generar reporte estadístico mensual
 */
export const generateMonthlyReport = async (year, month) => {
  try {
    const session = await getCurrentSession();
    if (!session.success) {
      throw new Error('Usuario no autenticado');
    }

    // Calcular rango de fechas
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Obtener tareas del mes
    let q = collection(db, 'tasks');
    const constraints = [
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    ];

    if (session.session.role !== 'admin') {
      constraints.push(where('userAccess', 'array-contains', session.session.userId));
    }

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calcular estadísticas
    const stats = calculateStatistics(tasks);

    // Generar reporte de texto
    const report = generateStatisticsText(stats, month, year);

    // Guardar archivo
    const fileName = `estadisticas_${year}_${String(month).padStart(2, '0')}.txt`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, report, {
      encoding: FileSystem.EncodingType.UTF8
    });

    // Compartir
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Estadísticas Mensuales'
      });
    }

    return filePath;
  } catch (error) {
    if (__DEV__) console.error('Error generando reporte mensual:', error);
    throw error;
  }
};

/**
 * Calcular estadísticas de tareas
 */
function calculateStatistics(tasks) {
  const stats = {
    total: tasks.length,
    completed: 0,
    pending: 0,
    inProgress: 0,
    byPriority: { high: 0, medium: 0, low: 0 },
    byDepartment: {},
    avgCompletionTime: 0,
    onTime: 0,
    delayed: 0
  };

  let totalCompletionTime = 0;
  let completedCount = 0;

  tasks.forEach(task => {
    // Por estado
    if (task.status === 'completed') {
      stats.completed++;
      completedCount++;

      // Tiempo de completado
      if (task.completedAt && task.createdAt) {
        const created = new Date(toMs(task.createdAt));
        const completed = new Date(toMs(task.completedAt));
        const days = Math.round((completed - created) / (1000 * 60 * 60 * 24));
        totalCompletionTime += days;

        // A tiempo o retrasado
        if (task.deadline) {
          const deadline = new Date(task.deadline);
          if (completed <= deadline) {
            stats.onTime++;
          } else {
            stats.delayed++;
          }
        }
      }
    } else if (task.status === 'in-progress') {
      stats.inProgress++;
    } else {
      stats.pending++;
    }

    // Por prioridad
    if (task.priority) {
      stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
    }

    // Por departamento
    const dept = task.department || 'Sin asignar';
    stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;
  });

  // Promedio de tiempo de completado
  if (completedCount > 0) {
    stats.avgCompletionTime = Math.round(totalCompletionTime / completedCount);
  }

  return stats;
}

/**
 * Generar texto del reporte estadístico
 */
function generateStatisticsText(stats, month, year) {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  let text = `REPORTE ESTADÍSTICO\n`;
  text += `${monthNames[month - 1]} ${year}\n`;
  text += `Generado: ${new Date().toLocaleString('es-MX')}\n`;
  text += `${'='.repeat(50)}\n\n`;

  text += `RESUMEN GENERAL\n`;
  text += `${'─'.repeat(50)}\n`;
  text += `Total de tareas: ${stats.total}\n`;
  text += `Completadas: ${stats.completed} (${percentage(stats.completed, stats.total)}%)\n`;
  text += `En progreso: ${stats.inProgress} (${percentage(stats.inProgress, stats.total)}%)\n`;
  text += `Pendientes: ${stats.pending} (${percentage(stats.pending, stats.total)}%)\n\n`;

  text += `RENDIMIENTO\n`;
  text += `${'─'.repeat(50)}\n`;
  text += `Tiempo promedio de completado: ${stats.avgCompletionTime} días\n`;
  text += `Completadas a tiempo: ${stats.onTime}\n`;
  text += `Completadas con retraso: ${stats.delayed}\n\n`;

  text += `POR PRIORIDAD\n`;
  text += `${'─'.repeat(50)}\n`;
  text += `Alta: ${stats.byPriority.high || 0}\n`;
  text += `Media: ${stats.byPriority.medium || 0}\n`;
  text += `Baja: ${stats.byPriority.low || 0}\n\n`;

  text += `POR DEPARTAMENTO\n`;
  text += `${'─'.repeat(50)}\n`;
  Object.entries(stats.byDepartment).forEach(([dept, count]) => {
    text += `${translateDepartment(dept)}: ${count}\n`;
  });

  return text;
}

// Utilidades
function escapeCSV(str) {
  return String(str).replace(/"/g, '""');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'number' ? new Date(dateStr) : new Date(dateStr);
    return date.toLocaleDateString('es-MX');
  } catch (e) {
    return '';
  }
}

function translateStatus(status) {
  const translations = {
    'pendiente': 'Pendiente',
    'en_proceso': 'En Proceso',
    'en_revision': 'En Revisión',
    'cerrada': 'Cerrada'
  };
  return translations[status] || status || 'Pendiente';
}

function translatePriority(priority) {
  const translations = {
    'alta': 'Alta',
    'media': 'Media',
    'baja': 'Baja'
  };
  return translations[priority] || priority || 'Media';
}

function translateDepartment(dept) {
  const translations = {
    'presidencia': 'Presidencia',
    'juridica': 'Jurídica',
    'obras': 'Obras Públicas',
    'tesoreria': 'Tesorería',
    'rrhh': 'Recursos Humanos',
    'administracion': 'Administración',
    'Sin asignar': 'Sin asignar'
  };
  return translations[dept] || dept;
}

function percentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Generar reporte de rendimiento de secretarios (solo admin)
 * @returns {Promise<string>} - Path o nombre del archivo generado
 */
export const generateSecretarioReport = async () => {
  try {
    const session = await getCurrentSession();
    if (!session.success) {
      throw new Error('Usuario no autenticado');
    }

    if (session.session.role !== 'admin') {
      throw new Error('Solo administradores pueden generar este reporte');
    }

    // Obtener usuarios secretarios
    const usersQuery = query(collection(db, 'users'), where('role', '==', 'secretario'));
    const usersSnapshot = await getDocs(usersQuery);
    const secretarios = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (secretarios.length === 0) {
      throw new Error('No hay secretarios registrados');
    }

    // Obtener todas las tareas
    const tasksQuery = query(collection(db, 'tasks'));
    const tasksSnapshot = await getDocs(tasksQuery);
    const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = now - (30 * 24 * 60 * 60 * 1000);

    // Calcular métricas por secretario
    const reportData = secretarios.map(secretario => {
      const tasksCreated = tasks.filter(t => 
        t.createdBy === secretario.email || t.createdBy === secretario.id
      );
      const tasksCompleted = tasksCreated.filter(t => t.status === 'cerrada');
      const tasksPending = tasksCreated.filter(t => t.status !== 'cerrada');
      const tasksOverdue = tasksPending.filter(t => t.dueAt && toMs(t.dueAt) < now);
      const tasksCreatedWeek = tasksCreated.filter(t => toMs(t.createdAt) >= weekAgo);
      const tasksCompletedWeek = tasksCompleted.filter(t => toMs(t.completedAt) >= weekAgo);
      const tasksCreatedMonth = tasksCreated.filter(t => toMs(t.createdAt) >= monthAgo);
      const tasksCompletedMonth = tasksCompleted.filter(t => toMs(t.completedAt) >= monthAgo);

      const onTimeCompleted = tasksCompleted.filter(t => 
        t.dueAt && t.completedAt && toMs(t.completedAt) <= toMs(t.dueAt)
      ).length;

      const completionRate = tasksCreated.length > 0 
        ? (tasksCompleted.length / tasksCreated.length * 100).toFixed(1)
        : 0;
      const onTimeRate = tasksCompleted.length > 0
        ? (onTimeCompleted / tasksCompleted.length * 100).toFixed(1)
        : 0;

      return {
        nombre: secretario.displayName || secretario.email,
        email: secretario.email,
        area: secretario.area || secretario.department || 'Sin área',
        totalDelegadas: tasksCreated.length,
        completadas: tasksCompleted.length,
        pendientes: tasksPending.length,
        vencidas: tasksOverdue.length,
        delegadasSemana: tasksCreatedWeek.length,
        completadasSemana: tasksCompletedWeek.length,
        delegadasMes: tasksCreatedMonth.length,
        completadasMes: tasksCompletedMonth.length,
        tasaCompletitud: completionRate,
        tasaATiempo: onTimeRate
      };
    });

    // Generar CSV
    const headers = [
      'Nombre',
      'Email',
      'Área',
      'Total Delegadas',
      'Completadas',
      'Pendientes',
      'Vencidas',
      'Delegadas Semana',
      'Completadas Semana',
      'Delegadas Mes',
      'Completadas Mes',
      'Tasa Completitud %',
      'Tasa A Tiempo %'
    ];

    const rows = reportData.map(s => [
      escapeCSV(s.nombre),
      escapeCSV(s.email),
      escapeCSV(s.area),
      s.totalDelegadas,
      s.completadas,
      s.pendientes,
      s.vencidas,
      s.delegadasSemana,
      s.completadasSemana,
      s.delegadasMes,
      s.completadasMes,
      s.tasaCompletitud,
      s.tasaATiempo
    ].map(field => `"${field}"`).join(','));

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows
    ].join('\n');

    const fileName = `reporte_secretarios_${new Date().toISOString().split('T')[0]}.csv`;

    // En web, descargar directamente
    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return fileName;
    }

    // En mobile, guardar y compartir
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(filePath, csv, {
      encoding: FileSystem.EncodingType.UTF8
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar Reporte de Secretarios'
      });
    }

    return filePath;
  } catch (error) {
    if (__DEV__) console.error('Error generando reporte de secretarios:', error);
    throw error;
  }
};
