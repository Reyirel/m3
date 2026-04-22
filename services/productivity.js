// services/productivity.js
// Servicio para calcular estadísticas de productividad
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { toMs } from '../utils/dateUtils';
import { isTaskAssignedToUser } from '../utils/taskHelpers';

const COLLECTION_NAME = 'tasks';

/**
 * Calcular racha de días productivos
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<{currentStreak: number, longestStreak: number}>}
 */
export async function calculateProductivityStreak(userEmail) {
  try {
    const tasksRef = collection(db, COLLECTION_NAME);
    const q = query(
      tasksRef,
      where('status', '==', 'cerrada'),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar solo tareas asignadas al usuario
    tasks = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
    
    if (tasks.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }
    
    // Agrupar por día
    const tasksByDay = {};
    tasks.forEach(task => {
      const date = new Date(toMs(task.updatedAt));
      const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      if (!tasksByDay[dayKey]) {
        tasksByDay[dayKey] = [];
      }
      tasksByDay[dayKey].push(task);
    });
    
    // Ordenar días
    const days = Object.keys(tasksByDay).sort().reverse();
    
    // Calcular racha actual
    let currentStreak = 0;
    const today = new Date();
    const _todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedKey = `${expectedDate.getFullYear()}-${expectedDate.getMonth() + 1}-${expectedDate.getDate()}`;
      
      if (day === expectedKey) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // Calcular racha más larga
    let longestStreak = 0;
    let tempStreak = 1;
    
    for (let i = 1; i < days.length; i++) {
      const prevDay = new Date(days[i - 1]);
      const currentDay = new Date(days[i]);
      const diffDays = Math.floor((prevDay - currentDay) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    
    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Error calculando racha:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Calcular tiempo promedio para completar tareas
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<number>} - Tiempo promedio en milisegundos
 */
export async function calculateAverageCompletionTime(userEmail) {
  try {
    const tasksRef = collection(db, COLLECTION_NAME);
    const q = query(
      tasksRef,
      where('status', '==', 'cerrada')
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar solo tareas asignadas al usuario
    tasks = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
    
    if (tasks.length === 0) return 0;
    
    const completionTimes = tasks
      .filter(task => task.createdAt && task.updatedAt)
      .map(task => {
        const created = toMs(task.createdAt);
        const updated = toMs(task.updatedAt);
        return updated - created;
      });
    
    if (completionTimes.length === 0) return 0;
    
    const average = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
    return average;
  } catch (error) {
    console.error('Error calculando tiempo promedio:', error);
    return 0;
  }
}

/**
 * Obtener datos de productividad semanal
 * @param {string} userEmail - Email del usuario
 * @returns {Promise<Array>} - Array con datos por día de la semana
 */
export async function getWeeklyProductivity(userEmail) {
  try {
    const tasksRef = collection(db, COLLECTION_NAME);
    
    // Obtener tareas de los últimos 7 días
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const q = query(
      tasksRef,
      where('updatedAt', '>=', sevenDaysAgo)
    );
    
    const snapshot = await getDocs(q);
    let tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filtrar solo tareas asignadas al usuario
    tasks = tasks.filter(task => isTaskAssignedToUser(task, userEmail));
    
    // Agrupar por día
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();
      
      const dayTasks = tasks.filter(task => {
        const updated = toMs(task.updatedAt);
        return updated >= dayStart && updated <= dayEnd;
      });
      
      const completed = dayTasks.filter(t => t.status === 'cerrada').length;
      const pending = dayTasks.filter(t => t.status !== 'cerrada').length;
      
      weekData.push({
        day: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
        completed,
        pending,
        total: dayTasks.length
      });
    }
    
    return weekData;
  } catch (error) {
    console.error('Error obteniendo productividad semanal:', error);
    return [];
  }
}

/**
 * Formatear tiempo promedio para mostrar
 * @param {number} milliseconds - Tiempo en milisegundos
 * @returns {string} - Tiempo formateado
 */
export function formatAverageTime(milliseconds) {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} día${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
  }
}
