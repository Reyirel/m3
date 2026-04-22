/**
 * 🔍 Listeners Cleanup Audit - Script para verificar desuscripciones
 * 
 * Buscar y validar que todos los listeners Firestore estén siendo
 * correctamente desinscriptos en useEffect cleanup
 */

import { greenBg, yellowBg, redBg, reset, bold } from '../utils/consoleColors';

/**
 * PATRÓN CORRECTO DE LISTENER:
 * 
 * useEffect(() => {
 *   let unsubscribe;
 *   
 *   const setup = async () => {
 *     unsubscribe = onSnapshot(query, (snapshot) => {
 *       // Handle data
 *     });
 *   };
 *   
 *   setup();
 *   
 *   // ✅ CRITICAL: Cleanup
 *   return () => {
 *     if (unsubscribe) {
 *       unsubscribe();
 *     }
 *   };
 * }, [dependencies]);
 */

/**
 * PROBLEMAS COMUNES:
 */

// ❌ INCORRECTO: Sin cleanup
/*
useEffect(() => {
  onSnapshot(query, (snapshot) => {
    setData(snapshot.docs.map(doc => doc.data()));
  });
  // Falta return () => { unsubscribe(); }
}, []);
*/

// ✅ CORRECTO: Con cleanup
/*
useEffect(() => {
  const unsubscribe = onSnapshot(query, (snapshot) => {
    setData(snapshot.docs.map(doc => doc.data()));
  });
  
  return () => unsubscribe(); // Cleanup
}, []);
*/

// ❌ INCORRECTO: En bucle infinito
/*
useEffect(() => {
  const unsubscribe = onSnapshot(query(db, 'tasks'), (snapshot) => {
    setTasks(snapshot.docs.map(doc => doc.data()));
  });
  return () => unsubscribe();
}, [tasks]); // tasks cambia → setup nuevo listener → tasks cambia...
*/

// ✅ CORRECTO: Sin task en dependencias
/*
useEffect(() => {
  const unsubscribe = onSnapshot(query(db, 'tasks'), (snapshot) => {
    setTasks(snapshot.docs.map(doc => doc.data()));
  });
  return () => unsubscribe();
}, []); // Solo setup 1 vez
*/

/**
 * CHECKLIST DE LISTENERS EN EL PROYECTO:
 * 
 * Buscar estos archivos y verificar cleanup:
 */

const filesToAudit = [
  'contexts/TasksContext.js',           // ← Principal listener de tareas
  'contexts/NotificationContext.js',     // ← Listener de notificaciones
  'screens/HomeScreen.js',               // ← Listeners en pantalla
  'screens/KanbanScreen.js',             // ← Listeners en pantalla
  'screens/TaskDetailScreen.js',         // ← Listeners de detalle
  'hooks/useNotifications.js',           // ← Hook de notificaciones
  'hooks/useTaskProgress.js',            // ← Hook de progreso
  'services/tasks.js',                   // ← Función subscribeToTasks
];

/**
 * HERRAMIENTAS DE DEBUGGING:
 */

// 1. Contar listeners activos
export function countActiveListeners() {
  // Nota: No hay API directa en Firebase para contar listeners
  // Pero puedes monitorear con un contador manual:
  
  let activeListeners = 0;
  
  window.__firestoreListeners = [];
  
  const originalOnSnapshot = firebase.firestore.onSnapshot;
  firebase.firestore.onSnapshot = function(...args) {
    const unsubscribe = originalOnSnapshot.apply(this, args);
    const id = Math.random();
    window.__firestoreListeners.push(id);
    
    return () => {
      window.__firestoreListeners = window.__firestoreListeners.filter(l => l !== id);
      unsubscribe();
    };
  };
  
  return () => window.__firestoreListeners.length;
}

// 2. Monitor de memory leaks
export function monitorMemoryLeaks() {
  console.log(`%c🔍 Firestore Listeners Monitor`, 'background: #222; color: #0f0; padding: 5px;');
  
  // Loguear listeners cada 5 segundos
  setInterval(() => {
    const count = window.__firestoreListeners?.length || 0;
    const status = count > 5 ? '⚠️ ALTO' : count > 2 ? '🟡 NORMAL' : '✅ BAJO';
    console.log(`Listeners activos: ${count} ${status}`);
  }, 5000);
}

/**
 * SCRIPT DE AUDITORÍA AUTOMÁTICA:
 * 
 * Ejecutar en console:
 */

/*
// paste en console del navegador durante desarrollo

(function() {
  console.log('%c📋 FIRESTORE LISTENERS AUDIT', 'background: #222; color: #f0f; padding: 10px; font-weight: bold;');
  
  const checks = {
    'TasksContext': {
      file: 'contexts/TasksContext.js',
      hasCleanup: '✅', // Ver si tiene return () => { unsubscribe() }
      dependencies: '✅',
    },
    'NotificationContext': {
      file: 'contexts/NotificationContext.js',
      hasCleanup: '❌', // Revisar
      dependencies: '⚠️',
    },
  };
  
  Object.entries(checks).forEach(([name, check]) => {
    console.log(`\n${name}:`);
    console.log(`  File: ${check.file}`);
    console.log(`  Cleanup: ${check.hasCleanup}`);
    console.log(`  Dependencies: ${check.dependencies}`);
  });
  
  console.log('\n%c⚠️ Listeners activos:', 'color: orange; font-weight: bold;');
  console.log('Verificar Developer Tools → Performance → Recording');
  console.log('Buscar "onSnapshot" en call stack');
})();
*/

/**
 * RECOMENDACIONES FINALES:
 */

export const auditGuidelines = `
🔍 CHECKLIST DE CLEANUP:

[ ] TasksContext.js
    - ✅ useEffect tiene return () => { unsubscribe() }
    - ✅ Dependencies no incluyen tasks (evita bucle)
    - ✅ Maneja errores de conexión
    - ✅ unsubscribeRef persiste entre renders

[ ] NotificationContext.js
    - ✅ Subscribe a notificaciones usuario actual
    - ✅ Cleanup al cambiar usuario
    - ✅ Desuscribirse al logout
    
[ ] Screens (HomeScreen, KanbanScreen, etc)
    - ✅ Si usan listeners, tienen cleanup
    - ⚠️ Preferir hooks personalizados en lugar de listeners directos
    
[ ] Hooks (useNotifications, useTaskProgress)
    - ✅ Retornan unsubscribe en cleanup
    - ✅ No recrean listeners innecesariamente

📊 EXPECTED RESULT:
- En reposo: 2-3 listeners máximo
- Durante navegación: transitorios (se limpian rápido)
- Nunca: listeners acumulándose (memory leak)

🚨 RED FLAGS:
- Listeners que crecen con cada acción
- useEffect dependencies incompletas
- No hay return () => { } en useEffect
- unsubscribe nunca es llamado
`;

console.log(auditGuidelines);

export default {
  checkListenersCleanup: true,
  auditFiles: filesToAudit,
  guidelines: auditGuidelines,
};
