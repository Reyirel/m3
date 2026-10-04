// services/analytics.js
// Servicio de análisis y estadísticas de tareas
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { toMs, diffMs } from '../utils/dateUtils';
import { isInProgress } from '../utils/taskStatus';
import { filterVisibleTasks, getUserSecretaria } from '../utils/taskVisibility';

// ✅ OPTIMIZACIÓN: Cache simple con TTL
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCachedData(key) {
  const cached = analyticsCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  analyticsCache.delete(key);
  return null;
}

function setCachedData(key, data) {
  analyticsCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Obtener métricas generales
 */
export const getGeneralMetrics = async (userId, userRole, user = null) => {
  try {
    // ✅ OPTIMIZACIÓN: Verificar cache primero
    const cacheKey = `metrics_${userId}_${userRole}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Cada rol calcula sus métricas solo con las tareas que puede ver
    // (misma regla que la lista de tareas: utils/taskVisibility.js)
    const scope = { ...(user || {}), role: userRole };
    const tasksRef = collection(db, 'tasks');
    const email = (scope.email || '').toLowerCase().trim();
    const queries = [];
    if (userRole === 'admin') {
      // ✅ OPTIMIZACIÓN: Agregar limit para no cargar todo
      queries.push(query(tasksRef, limit(500)));
    } else if (email) {
      queries.push(query(tasksRef, where('assignedTo', 'array-contains', email), limit(200)));
      const secretaria = userRole === 'secretario' ? getUserSecretaria(scope) : '';
      if (secretaria) {
        queries.push(query(tasksRef, where('secretarias', 'array-contains', secretaria), limit(500)));
      }
    }

    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    const byId = new Map();
    snapshots.forEach(snapshot => snapshot.docs.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() })));
    let tasks = filterVisibleTasks([...byId.values()], scope);

    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const weekAgo = today - (7 * 24 * 60 * 60 * 1000);
    const monthAgo = today - (30 * 24 * 60 * 60 * 1000);

    // Métricas básicas
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'cerrada').length;
    const pending = tasks.filter(t => t.status === 'pendiente').length;
    const inProgress = tasks.filter(t => isInProgress(t.status)).length;
    const inReview = tasks.filter(t => t.status === 'en_revision').length;
    const overdue = tasks.filter(t => 
      t.status !== 'cerrada' && t.dueAt && toMs(t.dueAt) < now
    ).length;

    // Métricas de tiempo
    const completedTasks = tasks.filter(t => t.status === 'cerrada' && t.completedAt && t.createdAt);
    const avgCompletionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => {
          return sum + diffMs(t.completedAt, t.createdAt);
        }, 0) / completedTasks.length
      : 0;

    // Tareas por prioridad
    const byPriority = {
      alta: tasks.filter(t => t.priority === 'alta').length,
      media: tasks.filter(t => t.priority === 'media').length,
      baja: tasks.filter(t => t.priority === 'baja').length,
    };

    // Tareas creadas en periodos
    const createdToday = tasks.filter(t => toMs(t.createdAt) >= today).length;
    const createdThisWeek = tasks.filter(t => toMs(t.createdAt) >= weekAgo).length;
    const createdThisMonth = tasks.filter(t => toMs(t.createdAt) >= monthAgo).length;

    // Tareas completadas en periodos
    const completedToday = tasks.filter(t => 
      t.status === 'cerrada' && toMs(t.completedAt) >= today
    ).length;
    const completedThisWeek = tasks.filter(t => 
      t.status === 'cerrada' && toMs(t.completedAt) >= weekAgo
    ).length;
    const completedThisMonth = tasks.filter(t => 
      t.status === 'cerrada' && toMs(t.completedAt) >= monthAgo
    ).length;

    // Tasa de completitud
    const completionRate = total > 0 ? (completed / total * 100).toFixed(1) : 0;

    // Productividad (tareas completadas vs creadas esta semana)
    const weeklyProductivity = createdThisWeek > 0 
      ? (completedThisWeek / createdThisWeek * 100).toFixed(1) 
      : 0;

    // ✅ OPTIMIZACIÓN: Guardar en cache antes de retornar
    const result = {
      success: true,
      metrics: {
        total,
        completed,
        pending,
        inProgress,
        inReview,
        overdue,
        completionRate: parseFloat(completionRate),
        avgCompletionTime: Math.round(avgCompletionTime),
        byPriority,
        periods: {
          today: { created: createdToday, completed: completedToday },
          week: { created: createdThisWeek, completed: completedThisWeek },
          month: { created: createdThisMonth, completed: completedThisMonth },
        },
        weeklyProductivity: parseFloat(weeklyProductivity),
      }
    };
    setCachedData(cacheKey, result);
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
};

