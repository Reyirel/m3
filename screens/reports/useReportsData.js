// screens/reports/useReportsData.js
// Datos de la pantalla de reportes: estadísticas por periodo, métricas por área,
// avance de subtareas y análisis (alertas, comparativas, cuellos de botella).
import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { calculateDetailedAreaMetrics, getAreasNeedingAttention } from '../../services/areaMetrics';
import { getAreaAlerts } from '../../services/AreaAlerts';
import {
  calculateMonthlyComparative,
  identifyBottlenecks,
  generateOptimizationSuggestions,
  analyzeWorkloadDistribution,
  getCachedAnalytics,
} from '../../services/AreaAnalytics';
import { subscribeToAreas } from '../../services/area/areaManagement';
import {
  EMPTY_PERIOD_STATS, PERIOD_DAYS, dailyCompletions, emptyMetricsByType, metricsByAreaType,
  periodStats, priorityDistribution, simpleAreaMetrics,
} from './reportStats';

// Tareas de las que se lee el avance de subtareas
const SUBTASK_SAMPLE = 20;
const EMPTY_SUBTASKS_STATS = { completed: 0, pending: 0, completionRate: 0 };

const EMPTY_REPORT = {
  statsByPeriod: { week: EMPTY_PERIOD_STATS, month: EMPTY_PERIOD_STATS, quarter: EMPTY_PERIOD_STATS },
  dailyCompletions: [],
  priorityDistribution: {},
  detailedAreaMetrics: {},
  areaMetrics: {},
  areasNeedingAttention: [],
};

// Avance de subtareas — lectura puntual (los reportes no necesitan actualizarse en vivo)
function useSubtasksProgress(tasks) {
  const [progress, setProgress] = useState({ subtasksStats: EMPTY_SUBTASKS_STATS, tasksWithProgress: [] });

  useEffect(() => {
    let mounted = true;

    if (tasks.length === 0) {
      setProgress({ subtasksStats: EMPTY_SUBTASKS_STATS, tasksWithProgress: [] });
      return undefined;
    }

    const load = async () => {
      try {
        // Lecturas en paralelo, en lugar de una suscripción por tarea
        const results = await Promise.all(
          tasks.slice(0, SUBTASK_SAMPLE).map(async (task) => {
            try {
              const subtasksRef = collection(db, 'tasks', task.id, 'subtasks');
              const snapshot = await getDocs(query(subtasksRef, orderBy('createdAt', 'asc')));
              const subtasks = snapshot.docs.map((d) => d.data());
              const completed = subtasks.filter((s) => s.status === 'completada').length;
              return { task, completed, total: subtasks.length };
            } catch {
              return { task, completed: 0, total: 0 };
            }
          })
        );
        if (!mounted) return;

        let totalCompleted = 0;
        let totalAll = 0;
        const withProgress = [];
        results.forEach(({ task, completed, total }) => {
          totalCompleted += completed;
          totalAll += total;
          if (total > 0) {
            withProgress.push({
              id: task.id,
              title: task.title,
              subtasksCompleted: completed,
              subtasksTotal: total,
              progress: Math.round((completed / total) * 100),
              status: task.status,
            });
          }
        });

        setProgress({
          tasksWithProgress: withProgress.sort((a, b) => b.progress - a.progress).slice(0, 10),
          subtasksStats: {
            completed: totalCompleted,
            pending: totalAll - totalCompleted,
            completionRate: totalAll > 0 ? Math.round((totalCompleted / totalAll) * 100) : 0,
          },
        });
      } catch (error) {
        if (__DEV__) console.warn('Error loading subtasks stats:', error?.message);
      }
    };
    load();

    return () => { mounted = false; };
  }, [tasks]);

  return progress;
}

// Áreas guardadas en Firestore, para saber cuáles son secretarías y cuáles direcciones
function useFirestoreAreas() {
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = subscribeToAreas(setAreas);
    } catch (error) {
      if (__DEV__) console.warn('Error subscribing to areas:', error);
    }
    return () => {
      if (typeof unsubscribe === 'function') {
        try {
          unsubscribe();
        } catch (error) {
          if (__DEV__) console.warn('Error unsubscribing from areas:', error);
        }
      }
    };
  }, []);

  return areas;
}

// Alertas, sugerencias y análisis a partir de las métricas por área
function useAreaAnalysis(tasks, areaMetrics) {
  const [analysis, setAnalysis] = useState({
    alerts: [], suggestions: [], monthlyComparative: null, bottlenecks: [], workloadDistribution: {},
  });

  useEffect(() => {
    if (tasks.length === 0 || Object.keys(areaMetrics).length === 0) {
      setAnalysis((prev) => ({ ...prev, alerts: [], suggestions: [] }));
      return;
    }
    try {
      const alerts = getCachedAnalytics('alerts', () => getAreaAlerts(areaMetrics));
      setAnalysis({
        alerts,
        monthlyComparative: calculateMonthlyComparative(tasks),
        bottlenecks: identifyBottlenecks(areaMetrics, tasks),
        workloadDistribution: analyzeWorkloadDistribution(areaMetrics, tasks),
        suggestions: generateOptimizationSuggestions(areaMetrics, tasks, alerts),
      });
    } catch (error) {
      if (__DEV__) console.error('Error calculando análisis avanzados:', error);
    }
  }, [areaMetrics, tasks]);

  return analysis;
}

/**
 * @param {Array} tasks - Tareas que el usuario puede ver (ya filtradas por rol)
 * @param {Object|null} currentUser - Sin usuario todavía no se calcula nada
 */
export function useReportsData(tasks, currentUser) {
  const firestoreAreas = useFirestoreAreas();
  const hasUser = !!currentUser;

  const report = useMemo(() => {
    if (!hasUser || tasks.length === 0) return EMPTY_REPORT;

    const week = periodStats(tasks, PERIOD_DAYS.week);
    const detailedAreaMetrics = calculateDetailedAreaMetrics(tasks, []);
    return {
      statsByPeriod: {
        week: week.stats,
        month: periodStats(tasks, PERIOD_DAYS.month).stats,
        quarter: periodStats(tasks, PERIOD_DAYS.quarter).stats,
      },
      dailyCompletions: dailyCompletions(week.completed),
      priorityDistribution: priorityDistribution(tasks),
      detailedAreaMetrics,
      areaMetrics: simpleAreaMetrics(detailedAreaMetrics),
      areasNeedingAttention: getAreasNeedingAttention(detailedAreaMetrics, 60),
    };
  }, [tasks, hasUser]);

  const metricsByType = useMemo(
    () => (report === EMPTY_REPORT ? emptyMetricsByType() : metricsByAreaType(report.detailedAreaMetrics, firestoreAreas)),
    [report, firestoreAreas]
  );

  return {
    ...report,
    metricsByType,
    ...useSubtasksProgress(tasks),
    ...useAreaAnalysis(tasks, report.areaMetrics),
  };
}
