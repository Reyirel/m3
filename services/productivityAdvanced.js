// services/productivityAdvanced.js
// Servicio avanzado de productividad: heatmap, gráficas semanales, tiempo estimado vs real
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { toMs, diffMs } from '../utils/dateUtils';
import { isTaskAssignedToUser } from '../utils/taskHelpers';


/**
 * Obtener datos de heatmap de actividad (estilo GitHub)
 * @param {string} userEmail - Email del usuario
 * @param {number} days - Número de días hacia atrás (default 90)
 * @returns {Promise<Array>} Array de {date, count, level}
 */
export async function getActivityHeatmap(userEmail, days = 90) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('completedAt', '>=', startDate.getTime()),
      orderBy('completedAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar solo tareas asignadas al usuario
    tasks = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
    
    // Agrupar por día
    const dayMap = {};
    tasks.forEach(task => {
      if (!task.completedAt) return;
      
      const date = new Date(toMs(task.completedAt));
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { date: dateKey, count: 0, tasks: [] };
      }
      
      dayMap[dateKey].count++;
      dayMap[dateKey].tasks.push(task.title);
    });
    
    // Crear array con todos los días (incluyendo 0)
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const dayData = dayMap[dateKey] || { date: dateKey, count: 0, tasks: [] };
      
      // Calcular nivel de intensidad (0-4)
      let level = 0;
      if (dayData.count > 0) level = 1;
      if (dayData.count >= 2) level = 2;
      if (dayData.count >= 4) level = 3;
      if (dayData.count >= 6) level = 4;
      
      result.push({ ...dayData, level });
    }
    
    return result;
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo heatmap:', error);
    return [];
  }
}

/**
 * Obtener productividad semanal (últimas 12 semanas)
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<Array>} Array de {week, tasksCreated, tasksCompleted}
 */
export async function getWeeklyProductivityChart(userEmail) {
  try {
    const weeksBack = 12;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (weeksBack * 7));
    
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('createdAt', '>=', startDate.getTime())
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar solo tareas asignadas al usuario
    tasks = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
    
    // Agrupar por semana
    const weekMap = {};
    
    tasks.forEach(task => {
      const createdDate = new Date(toMs(task.createdAt));
      const weekStart = new Date(createdDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = `${weekStart.getFullYear()}-W${String(Math.ceil((weekStart.getDate()) / 7)).padStart(2, '0')}`;
      
      if (!weekMap[weekKey]) {
        weekMap[weekKey] = { 
          week: weekKey, 
          weekStart: weekStart.toISOString(),
          tasksCreated: 0, 
          tasksCompleted: 0,
          avgCompletionTime: 0,
          totalCompletionTime: 0
        };
      }
      
      weekMap[weekKey].tasksCreated++;
      
      if (task.status === 'cerrada' && task.completedAt) {
        weekMap[weekKey].tasksCompleted++;
        
        if (task.createdAt) {
          const completionTime = diffMs(task.completedAt, task.createdAt);
          weekMap[weekKey].totalCompletionTime += completionTime;
        }
      }
    });
    
    // Calcular promedios
    Object.values(weekMap).forEach(week => {
      if (week.tasksCompleted > 0) {
        week.avgCompletionTime = Math.round(week.totalCompletionTime / week.tasksCompleted / (1000 * 60 * 60 * 24)); // días
      }
    });
    
    return Object.values(weekMap).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo productividad semanal:', error);
    return [];
  }
}

/**
 * Obtener comparación tiempo estimado vs real
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<Object>} { avgEstimated, avgReal, accuracy, tasks }
 */
export async function getEstimatedVsRealTime(userEmail) {
  try {
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('status', '!=', 'cerrada')
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar solo tareas asignadas al usuario
    tasks = tasks
      .filter(task => isTaskAssignedToUser(task, userEmail))
      .filter(t => t.estimatedHours && t.completedAt && t.createdAt);
    
    if (tasks.length === 0) {
      return { 
        avgEstimated: 0, 
        avgReal: 0, 
        accuracy: 0, 
        tasks: [],
        totalTasks: 0
      };
    }
    
    const tasksWithComparison = tasks.map(task => {
      const realHours = diffMs(task.completedAt, task.createdAt) / (1000 * 60 * 60);
      const estimated = task.estimatedHours || 0;
      const difference = realHours - estimated;
      const accuracyPercent = estimated > 0 ? Math.abs((difference / estimated) * 100) : 0;
      
      return {
        id: task.id,
        title: task.title,
        estimated,
        real: Math.round(realHours * 10) / 10,
        difference: Math.round(difference * 10) / 10,
        accuracy: 100 - Math.min(accuracyPercent, 100)
      };
    });
    
    const avgEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0) / tasks.length;
    const avgReal = tasksWithComparison.reduce((sum, t) => sum + t.real, 0) / tasks.length;
    const avgAccuracy = tasksWithComparison.reduce((sum, t) => sum + t.accuracy, 0) / tasks.length;
    
    return {
      avgEstimated: Math.round(avgEstimated * 10) / 10,
      avgReal: Math.round(avgReal * 10) / 10,
      accuracy: Math.round(avgAccuracy),
      tasks: tasksWithComparison,
      totalTasks: tasks.length
    };
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo tiempo estimado vs real:', error);
    return { avgEstimated: 0, avgReal: 0, accuracy: 0, tasks: [], totalTasks: 0 };
  }
}

/**
 * Obtener estadísticas de productividad por hora del día
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<Array>} Array de {hour, tasksCompleted}
 */
export async function getProductivityByHour(userEmail) {
  try {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('status', '==', 'cerrada'),
      where('completedAt', '>=', thirtyDaysAgo)
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar solo tareas asignadas al usuario
    tasks = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
    
    // Agrupar por hora
    const hourMap = {};
    for (let i = 0; i < 24; i++) {
      hourMap[i] = 0;
    }
    
    tasks.forEach(task => {
      if (!task.completedAt) return;
      const date = new Date(toMs(task.completedAt));
      const hour = date.getHours();
      hourMap[hour]++;
    });
    
    return Object.entries(hourMap).map(([hour, count]) => ({
      hour: parseInt(hour),
      label: `${String(hour).padStart(2, '0')}:00`,
      count
    }));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo productividad por hora:', error);
    return [];
  }
}

/**
 * Formatear duración en formato legible
 */
export function formatDuration(hours) {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return `${days}d ${remainingHours}h`;
}
