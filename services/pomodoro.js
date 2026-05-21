// services/pomodoro.js
// Servicio para gestionar sesiones de Pomodoro y tracking de tiempo de trabajo
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { toMs } from '../utils/dateUtils';

const log = __DEV__ ? console.log : () => {};

const POMODORO_KEY = '@pomodoro_sessions';

/**
 * Guardar sesión de Pomodoro
 */
export async function savePomodoroSession(session) {
  try {
    // Guardar en Firestore
    const sessionsRef = collection(db, 'pomodoroSessions');
    const docRef = await addDoc(sessionsRef, {
      ...session,
      createdAt: Date.now()
    });
    
    // Guardar localmente
    const sessions = await getLocalSessions();
    sessions.push({ ...session, id: docRef.id, createdAt: Date.now() });
    await AsyncStorage.setItem(POMODORO_KEY, JSON.stringify(sessions));
    
    log('✅ Sesión Pomodoro guardada:', session);
    return { success: true, id: docRef.id };
  } catch (error) {
    if (__DEV__) console.error('❌ Error guardando sesión Pomodoro:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener sesiones locales (fallback)
 */
async function getLocalSessions() {
  try {
    const data = await AsyncStorage.getItem(POMODORO_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    if (__DEV__) console.error('Error leyendo sesiones locales:', error);
    return [];
  }
}

/**
 * Obtener sesiones de Pomodoro de un usuario
 */
export async function getUserPomodoroSessions(userEmail, days = 30) {
  try {
    const startDate = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const sessionsRef = collection(db, 'pomodoroSessions');
    const q = query(
      sessionsRef,
      where('userEmail', '==', userEmail),
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return sessions;
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo sesiones:', error);
    // Fallback a local
    return await getLocalSessions();
  }
}

/**
 * Obtener sesiones por tarea
 */
export async function getTaskPomodoroSessions(taskId) {
  try {
    const sessionsRef = collection(db, 'pomodoroSessions');
    const q = query(
      sessionsRef,
      where('taskId', '==', taskId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo sesiones de tarea:', error);
    return [];
  }
}

/**
 * Obtener estadísticas de focus time
 */
export async function getFocusTimeStats(userEmail, days = 30) {
  try {
    const sessions = await getUserPomodoroSessions(userEmail, days);
    
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        totalMinutes: 0,
        completedSessions: 0,
        avgSessionLength: 0,
        totalFocusTime: 0,
        totalBreakTime: 0,
        sessionsPerDay: 0
      };
    }
    
    const completed = sessions.filter(s => s.completed);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
    const totalBreakTime = sessions.reduce((sum, s) => sum + (s.breakDuration || 5), 0);
    
    return {
      totalSessions: sessions.length,
      totalMinutes,
      completedSessions: completed.length,
      avgSessionLength: Math.round(totalMinutes / sessions.length),
      totalFocusTime: totalMinutes,
      totalBreakTime,
      sessionsPerDay: Math.round(sessions.length / days * 10) / 10,
      completionRate: Math.round((completed.length / sessions.length) * 100)
    };
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo estadísticas de focus time:', error);
    return {
      totalSessions: 0,
      totalMinutes: 0,
      completedSessions: 0,
      avgSessionLength: 0,
      totalFocusTime: 0,
      totalBreakTime: 0,
      sessionsPerDay: 0
    };
  }
}

/**
 * Obtener distribución de sesiones por día de la semana
 */
export async function getSessionsByDayOfWeek(userEmail) {
  try {
    const sessions = await getUserPomodoroSessions(userEmail, 90);
    
    const dayMap = {
      0: { day: 'Dom', sessions: 0 },
      1: { day: 'Lun', sessions: 0 },
      2: { day: 'Mar', sessions: 0 },
      3: { day: 'Mié', sessions: 0 },
      4: { day: 'Jue', sessions: 0 },
      5: { day: 'Vie', sessions: 0 },
      6: { day: 'Sáb', sessions: 0 }
    };
    
    sessions.forEach(session => {
      const date = new Date(toMs(session.createdAt));
      const dayOfWeek = date.getDay();
      dayMap[dayOfWeek].sessions++;
    });
    
    return Object.values(dayMap);
  } catch (error) {
    if (__DEV__) console.error('Error obteniendo sesiones por día:', error);
    return [];
  }
}

/**
 * Calcular tiempo total trabajado en una tarea
 */
export async function getTaskTotalWorkTime(taskId) {
  try {
    const sessions = await getTaskPomodoroSessions(taskId);
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 25), 0);
    
    return {
      totalSessions: sessions.length,
      totalMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10
    };
  } catch (error) {
    if (__DEV__) console.error('Error calculando tiempo total:', error);
    return { totalSessions: 0, totalMinutes: 0, totalHours: 0 };
  }
}
