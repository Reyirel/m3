// services/recurrence.js
// Servicio para manejar tareas recurrentes
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const log = __DEV__ ? console.log : () => {};

const COLLECTION_NAME = 'tasks';

/**
 * Calcular la próxima fecha según el patrón de recurrencia
 * @param {number} currentDate - Timestamp actual
 * @param {string} pattern - 'daily', 'weekly', 'monthly'
 * @returns {number} - Nuevo timestamp
 */
export function getNextRecurrenceDate(currentDate, pattern) {
  const date = new Date(currentDate);
  
  switch (pattern) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return date.getTime();
}

/**
 * Verificar y crear nuevas instancias de tareas recurrentes
 * Se ejecuta periódicamente
 */
export async function processRecurringTasks() {
  log('🔄 Procesando tareas recurrentes...');
  
  try {
    const tasksRef = collection(db, COLLECTION_NAME);
    const q = query(tasksRef, where('isRecurring', '==', true));
    const snapshot = await getDocs(q);
    
    const now = Date.now();
    let created = 0;
    
    for (const taskDoc of snapshot.docs) {
      const task = taskDoc.data();
      if (!task.dueAt || !task.recurrencePattern) continue;
      const lastCreated = task.lastRecurrenceCreated || task.createdAt;
      const nextDueDate = getNextRecurrenceDate(task.dueAt, task.recurrencePattern);
      
      // Si ya pasó el tiempo para crear la siguiente instancia
      if (now >= nextDueDate && lastCreated < nextDueDate) {
        // Crear nueva instancia
        const newTask = {
          ...task,
          dueAt: nextDueDate,
          createdAt: serverTimestamp(),
          status: 'pendiente',
          parentRecurringTaskId: taskDoc.id,
          isRecurring: false // Las instancias no son recurrentes
        };
        
        // Remover campos que no deben duplicarse
        delete newTask.id;
        delete newTask.lastRecurrenceCreated;
        
        await addDoc(collection(db, COLLECTION_NAME), newTask);
        
        // Actualizar la tarea recurrente original
        await updateDoc(doc(db, COLLECTION_NAME, taskDoc.id), {
          lastRecurrenceCreated: nextDueDate
        });
        
        created++;
        log(`✅ Nueva instancia de "${task.title}" para ${new Date(nextDueDate).toLocaleDateString()}`);
      }
    }
    
    log(`✅ Procesamiento completado: ${created} tareas creadas`);
    return { success: true, created };
  } catch (error) {
    if (__DEV__) console.error('❌ Error procesando tareas recurrentes:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener label descriptivo del patrón de recurrencia
 */
export function getRecurrenceLabel(pattern) {
  const labels = {
    'daily': 'Diaria',
    'weekly': 'Semanal',
    'monthly': 'Mensual'
  };
  return labels[pattern] || 'Personalizada';
}
