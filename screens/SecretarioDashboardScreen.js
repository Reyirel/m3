// screens/SecretarioDashboardScreen.js
// Dashboard exclusivo para Secretarios con métricas de sus direcciones y directores

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { getDireccionesBySecretaria, resolveAreaName } from '../config/areas';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import ShimmerEffect from '../components/ShimmerEffect';
import { toMs } from '../utils/dateUtils';

const { width } = Dimensions.get('window');

export default function SecretarioDashboardScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { tasks: contextTasks, currentUser } = useTasks();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    coordinationTasks: 0,
    coordinationPending: 0,
    completionRate: 0,
    avgCompletionTime: 0,
  });
  const [directorMetrics, setDirectorMetrics] = useState([]);
  const [selectedDirector, setSelectedDirector] = useState(null);

  useEffect(() => {
    if (currentUser) loadInitialData();
  }, [currentUser?.email]);

  // Recalcular métricas cuando cambian las tareas del context o los directores
  useEffect(() => {
    if (!currentUser) return;
    const secArea = resolveAreaName(currentUser.area || '');
    const direccionesOficiales = getDireccionesBySecretaria(secArea);
    const direccionesFirebase = currentUser.direcciones || [];
    const direcciones = [...new Set([...direccionesOficiales, ...direccionesFirebase])].filter(Boolean);

    const areaTasks = contextTasks.filter(task => {
      const taskArea = task.area || '';
      const taskAreas = task.areas || [taskArea];
      const isInMyArea = direcciones.some(dir =>
        taskAreas.map(a => resolveAreaName(a)).includes(resolveAreaName(dir)) ||
        resolveAreaName(taskArea) === resolveAreaName(dir)
      );
      const isAssignedToMyDirector = directors.some(dir =>
        Array.isArray(task.assignedTo)
          ? task.assignedTo.includes(dir.email)
          : task.assignedTo === dir.email
      );
      const isCoordinationWithMyArea = task.isCoordinationTask &&
        taskAreas.some(area => direcciones.map(resolveAreaName).includes(resolveAreaName(area)));
      return isInMyArea || isAssignedToMyDirector || isCoordinationWithMyArea;
    });

    setTasks(areaTasks);
    calculateMetrics(areaTasks, directors);
  }, [contextTasks, directors, currentUser?.email]);

  const loadInitialData = async () => {
    setLoadError(false);
    try {
      if (currentUser && currentUser.role === 'secretario') {
        await loadDirectors(currentUser);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading data:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadDirectors = async (user) => {
    try {
      // Obtener las direcciones del secretario usando mapeo oficial primero
      const direccionesOficiales = getDireccionesBySecretaria(user.area || '');
      const direccionesFirebase = user.direcciones || [];
      // Combinar ambas fuentes sin duplicados
      const direcciones = [...new Set([...direccionesOficiales, ...direccionesFirebase])].filter(Boolean);
      const secretariaArea = user.area || '';
      
      // Buscar directores de sus áreas
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'director'));
      const snapshot = await getDocs(q);
      
      const myDirectors = [];
      snapshot.forEach(doc => {
        const directorData = { id: doc.id, ...doc.data() };
        // Verificar si el director pertenece a alguna de las direcciones del secretario
        if (direcciones.includes(directorData.area) || 
            direcciones.includes(directorData.department) ||
            directorData.area?.includes(secretariaArea)) {
          myDirectors.push(directorData);
        }
      });
      
      setDirectors(myDirectors);
    } catch (error) {
      if (__DEV__) console.error('Error loading directors:', error);
    }
  };

  const calculateMetrics = (areaTasks, myDirectors) => {
    const now = new Date();
    
    // Métricas generales
    const pendingTasks = areaTasks.filter(t => t.status === 'pendiente');
    const inProgressTasks = areaTasks.filter(t => t.status === 'en_proceso' || t.status === 'en_progreso' || t.status === 'en-progreso');
    const completedTasks = areaTasks.filter(t => t.status === 'completada' || t.status === 'cerrada');
    const overdueTasks = areaTasks.filter(t => {
      if (t.status === 'completada' || t.status === 'cerrada') return false;
      const dueMs = toMs(t.dueAt);
      const dueDate = dueMs ? new Date(dueMs) : null;
      return dueDate && dueDate < now;
    });
    
    // Tareas de coordinación
    const coordinationTasks = areaTasks.filter(t => t.isCoordinationTask);
    const coordinationPending = coordinationTasks.filter(t => 
      t.status !== 'completada' && t.status !== 'cerrada'
    );
    
    // Tasa de cumplimiento
    const completionRate = areaTasks.length > 0 
      ? Math.round((completedTasks.length / areaTasks.length) * 100) 
      : 0;
    
    // Métricas por director - Rendimiento del ÁREA que supervisan (no tareas asignadas a ellos)
    const dirMetrics = myDirectors.map(director => {
      // Tareas del ÁREA que supervisa el director (no las asignadas a él)
      const areaTasks_dir = areaTasks.filter(t => t.area === director.area);
      const areaCompleted = areaTasks_dir.filter(t => 
        t.status === 'completada' || t.status === 'cerrada'
      );
      const areaPending = areaTasks_dir.filter(t => t.status === 'pendiente');
      const areaInProgress = areaTasks_dir.filter(t => t.status === 'en_proceso' || t.status === 'en_progreso' || t.status === 'en-progreso');
      const areaOverdue = areaTasks_dir.filter(t => {
        if (t.status === 'completada' || t.status === 'cerrada') return false;
        const dueMs = toMs(t.dueAt);
        const dueDate = dueMs ? new Date(dueMs) : null;
        return dueDate && dueDate < now;
      });
      
      return {
        ...director,
        // Estadísticas del ÁREA que supervisa
        areaTotalTasks: areaTasks_dir.length,
        areaCompletedTasks: areaCompleted.length,
        areaPendingTasks: areaPending.length,
        areaInProgressTasks: areaInProgress.length,
        areaOverdueTasks: areaOverdue.length,
        areaCompletionRate: areaTasks_dir.length > 0 
          ? Math.round((areaCompleted.length / areaTasks_dir.length) * 100) 
          : 0,
      };
    }).sort((a, b) => b.areaCompletionRate - a.areaCompletionRate);
    
    setMetrics({
      totalTasks: areaTasks.length,
      pendingTasks: pendingTasks.length,
      inProgressTasks: inProgressTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      coordinationTasks: coordinationTasks.length,
      coordinationPending: coordinationPending.length,
      completionRate,
    });
    
    setDirectorMetrics(dirMetrics);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  // Pre-compute per-direction task data to avoid repeated filter() in render
  const directionTasksMap = useMemo(() => {
    const now = Date.now();
    const map = {};
    (currentUser?.direcciones || []).forEach(direccion => {
      const dirTasks = tasks.filter(t =>
        (t.area === direccion || t.areas?.includes(direccion)) &&
        t.status !== 'completada' && t.status !== 'cerrada'
      );
      const overdue = dirTasks.filter(t => {
        const dueDate = t.dueAt ? new Date(toMs(t.dueAt)) : null;
        return dueDate && dueDate.getTime() < now;
      });
      map[direccion] = { directionTasks: dirTasks, overdue };
    });
    return map;
  }, [tasks, currentUser]);

  const getCompletionColor = (rate) => {
    if (rate >= 80) return '#34C759';
    if (rate >= 50) return '#FF9500';
    return '#FF3B30';
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
          style={[styles.header, { justifyContent: 'flex-end', paddingBottom: 20 }]}
        >
          <ShimmerEffect width={200} height={20} borderRadius={8} style={{ marginBottom: 8 }} />
          <ShimmerEffect width={260} height={16} borderRadius={6} />
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} scrollEnabled={false}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[...Array(3)].map((_, i) => (
              <ShimmerEffect key={i} width={(width - 52) / 3} height={80} borderRadius={12} />
            ))}
          </View>
          <ShimmerEffect width="100%" height={140} borderRadius={14} />
          <ShimmerEffect width="100%" height={100} borderRadius={14} />
          {[...Array(3)].map((_, i) => (
            <ShimmerEffect key={i} width="100%" height={72} borderRadius={12} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Ionicons name="cloud-offline-outline" size={56} color={theme.textSecondary} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, marginTop: 16, textAlign: 'center' }}>
          Error al cargar
        </Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 8, textAlign: 'center' }}>
          No se pudo conectar. Verifica tu internet.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: theme.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          onPress={() => { setLoading(true); loadInitialData(); }}
          accessibilityLabel="Reintentar"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#2A1520', '#1A1A1A'] : ['#9F2241', '#7F1D35']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>👋 Hola, {currentUser?.displayName?.split(' ')[0] || 'Secretario'}</Text>
            <Text style={styles.headerTitle}>Dashboard de tu Secretaría</Text>
            <Text style={styles.headerSubtitle}>{currentUser?.area || 'Sin área asignada'}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            accessibilityLabel="Actualizar"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Resumen General */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="stats-chart" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Resumen General</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A30' : '#F0F9FF' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="document-text" size={20} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{metrics.totalTasks}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A30' : '#FEF3C7' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#F5920020' }]}>
                <Ionicons name="time" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{metrics.pendingTasks}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Pendientes</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A30' : '#ECFDF5' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#34C75920' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#34C759" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{metrics.completedTasks}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Completadas</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: isDark ? '#2A2A30' : '#FEF2F2' }]}>
              <View style={[styles.statIcon, { backgroundColor: '#EF444420' }]}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{metrics.overdueTasks}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Vencidas</Text>
            </View>
          </View>
          
          {/* Barra de cumplimiento */}
          <View style={styles.completionSection}>
            <View style={styles.completionHeader}>
              <Text style={[styles.completionLabel, { color: theme.textSecondary }]}>
                Tasa de Cumplimiento
              </Text>
              <Text style={[styles.completionValue, { color: getCompletionColor(metrics.completionRate) }]}>
                {metrics.completionRate}%
              </Text>
            </View>
            <ProgressBar 
              progress={metrics.completionRate} 
              color={getCompletionColor(metrics.completionRate)}
              size="medium"
            />
          </View>
        </View>

        {/* Tareas de Coordinación */}
        {metrics.coordinationTasks > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-branch" size={20} color="#9C27B0" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tareas de Coordinación</Text>
              {metrics.coordinationPending > 0 && (
                <View style={[styles.badge, { backgroundColor: '#9C27B0' }]}>
                  <Text style={styles.badgeText}>{metrics.coordinationPending}</Text>
                </View>
              )}
            </View>
            
            <View style={[styles.coordinationCard, { backgroundColor: isDark ? '#2A2A30' : '#F3E5F5' }]}>
              <View style={styles.coordinationInfo}>
                <Text style={[styles.coordinationValue, { color: '#9C27B0' }]}>
                  {metrics.coordinationTasks}
                </Text>
                <Text style={[styles.coordinationLabel, { color: theme.textSecondary }]}>
                  Tareas multi-área
                </Text>
              </View>
              <View style={styles.coordinationStats}>
                <View style={styles.coordinationStat}>
                  <Ionicons name="hourglass" size={16} color="#FF9500" />
                  <Text style={[styles.coordinationStatText, { color: theme.text }]}>
                    {metrics.coordinationPending} pendientes
                  </Text>
                </View>
                <View style={styles.coordinationStat}>
                  <Ionicons name="checkmark" size={16} color="#34C759" />
                  <Text style={[styles.coordinationStatText, { color: theme.text }]}>
                    {metrics.coordinationTasks - metrics.coordinationPending} completadas
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.viewAllButton, { borderColor: '#9C27B0' }]}
              onPress={() => navigation.navigate('Home', { filter: 'coordination' })}
            >
              <Text style={[styles.viewAllText, { color: '#9C27B0' }]}>
                Ver tareas de coordinación
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#9C27B0" />
            </TouchableOpacity>
          </View>
        )}

        {/* Resumen del Área - Solo métricas generales, sin exponer compañeros */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Resumen General del Área</Text>
          </View>
          
          <View style={styles.areaSummaryCard}>
            <View style={styles.areaSummaryRow}>
              <View style={styles.areaSummaryStat}>
                <Ionicons name="layers" size={24} color={theme.primary} />
                <Text style={[styles.areaSummaryValue, { color: theme.text }]}>{metrics.totalTasks}</Text>
                <Text style={[styles.areaSummaryLabel, { color: theme.textSecondary }]}>Total Tareas</Text>
              </View>
              <View style={styles.areaSummaryStat}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                <Text style={[styles.areaSummaryValue, { color: '#34C759' }]}>{metrics.completedTasks}</Text>
                <Text style={[styles.areaSummaryLabel, { color: theme.textSecondary }]}>Completadas</Text>
              </View>
              <View style={styles.areaSummaryStat}>
                <Ionicons name="time" size={24} color="#FF9500" />
                <Text style={[styles.areaSummaryValue, { color: '#FF9500' }]}>{metrics.pendingTasks}</Text>
                <Text style={[styles.areaSummaryLabel, { color: theme.textSecondary }]}>Pendientes</Text>
              </View>
              <View style={styles.areaSummaryStat}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <Text style={[styles.areaSummaryValue, { color: '#EF4444' }]}>{metrics.overdueTasks}</Text>
                <Text style={[styles.areaSummaryLabel, { color: theme.textSecondary }]}>Vencidas</Text>
              </View>
            </View>
            <View style={styles.areaSummaryProgress}>
              <View style={styles.areaSummaryProgressHeader}>
                <Text style={[styles.areaSummaryProgressLabel, { color: theme.textSecondary }]}>
                  Cumplimiento del área
                </Text>
                <Text style={[styles.areaSummaryProgressValue, { color: getCompletionColor(metrics.completionRate) }]}>
                  {metrics.completionRate}%
                </Text>
              </View>
              <ProgressBar 
                progress={metrics.completionRate} 
                color={getCompletionColor(metrics.completionRate)}
                size="medium"
              />
            </View>
          </View>
        </View>

        {/* Tareas Pendientes por Dirección */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="folder-open" size={20} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Tareas Pendientes por Dirección</Text>
          </View>
          
          {currentUser?.direcciones?.length > 0 ? (
            currentUser.direcciones.map((direccion, index) => {
              const { directionTasks, overdue } = directionTasksMap[direccion] || { directionTasks: [], overdue: [] };
              
              return (
                <TouchableOpacity 
                  key={index}
                  style={[styles.directionCard, { backgroundColor: isDark ? '#2A2A30' : '#FFFBEB' }]}
                  onPress={() => navigation.navigate('Home', { filterArea: direccion })}
                >
                  <View style={styles.directionIcon}>
                    <Ionicons name="business" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.directionInfo}>
                    <Text style={[styles.directionName, { color: theme.text }]} numberOfLines={1}>
                      {direccion}
                    </Text>
                    <Text style={[styles.directionStats, { color: theme.textSecondary }]}>
                      {directionTasks.length} pendientes
                      {overdue.length > 0 && (
                        <Text style={{ color: '#EF4444' }}> • {overdue.length} vencidas</Text>
                      )}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="folder-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No hay direcciones configuradas
              </Text>
            </View>
          )}
        </View>

        {/* Directores Adscritos */}
        {directorMetrics.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#8B5CF6" />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Directores Adscritos</Text>
              <View style={[styles.badge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.badgeText}>{directorMetrics.length}</Text>
              </View>
            </View>

            {directorMetrics.map((director) => (
              <View
                key={director.id}
                style={[styles.directorCard, { backgroundColor: isDark ? '#2A2A30' : '#F8F7FF', borderColor: isDark ? '#3A3A45' : '#E5E7EB' }]}
              >
                {/* Cabecera: avatar + nombre + badge cumplimiento */}
                <View style={styles.directorHeader}>
                  <Avatar name={director.displayName || director.email} size={40} />
                  <View style={styles.directorInfo}>
                    <Text style={[styles.directorName, { color: theme.text }]} numberOfLines={1}>
                      {director.displayName || director.email}
                    </Text>
                    <Text style={[styles.directorArea, { color: theme.textSecondary }]} numberOfLines={1}>
                      {director.area || 'Sin área'}
                    </Text>
                  </View>
                  <View style={[styles.complianceBadge, { backgroundColor: getCompletionColor(director.areaCompletionRate) + '20' }]}>
                    <Text style={[styles.complianceValue, { color: getCompletionColor(director.areaCompletionRate) }]}>
                      {director.areaCompletionRate}%
                    </Text>
                  </View>
                </View>

                {/* Stats: total · pendientes · vencidas · completadas */}
                <View style={styles.directorStats}>
                  <View style={styles.directorStat}>
                    <Text style={[styles.directorStatValue, { color: theme.text }]}>{director.areaTotalTasks}</Text>
                    <Text style={[styles.directorStatLabel, { color: theme.textSecondary }]}>Total</Text>
                  </View>
                  <View style={styles.directorStat}>
                    <Text style={[styles.directorStatValue, { color: '#F59E0B' }]}>{director.areaPendingTasks}</Text>
                    <Text style={[styles.directorStatLabel, { color: theme.textSecondary }]}>Pendientes</Text>
                  </View>
                  <View style={styles.directorStat}>
                    <Text style={[styles.directorStatValue, { color: '#EF4444' }]}>{director.areaOverdueTasks}</Text>
                    <Text style={[styles.directorStatLabel, { color: theme.textSecondary }]}>Vencidas</Text>
                  </View>
                  <View style={styles.directorStat}>
                    <Text style={[styles.directorStatValue, { color: '#34C759' }]}>{director.areaCompletedTasks}</Text>
                    <Text style={[styles.directorStatLabel, { color: theme.textSecondary }]}>Completadas</Text>
                  </View>
                </View>

                {/* Barra de cumplimiento */}
                <ProgressBar
                  progress={director.areaCompletionRate}
                  color={getCompletionColor(director.areaCompletionRate)}
                  size="small"
                />

                {/* Acciones */}
                <View style={styles.directorActions}>
                  <TouchableOpacity
                    style={[styles.directorActionBtn, { borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Home', { filterArea: director.area })}
                  >
                    <Ionicons name="list-outline" size={15} color={theme.textSecondary} />
                    <Text style={[styles.directorActionText, { color: theme.textSecondary }]}>Ver tareas</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.directorActionBtn, { borderColor: '#3B82F6', backgroundColor: '#3B82F620' }]}
                    onPress={() => setSelectedDirector(director)}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color="#3B82F6" />
                    <Text style={[styles.directorActionText, { color: '#3B82F6' }]}>Mensajear</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Acciones Rápidas */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={20} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Acciones Rápidas</Text>
          </View>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#6B728020' }]}
              onPress={() => {
                Alert.alert(
                  'Acción no permitida',
                  'Los secretarios no pueden crear tareas principales. Solo puedes crear subtareas desde las tareas asignadas por el administrador.',
                  [{ text: 'Entendido', style: 'default' }]
                );
              }}
            >
              <Ionicons name="lock-closed" size={28} color="#6B7280" />
              <Text style={[styles.actionText, { color: '#6B7280' }]}>Nueva Tarea (Bloqueado)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#3B82F620' }]}
              onPress={() => navigation.navigate('MyAreaReports')}
            >
              <Ionicons name="document-text" size={28} color="#3B82F6" />
              <Text style={[styles.actionText, { color: theme.text }]}>Ver Reportes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#34C75920' }]}
              onPress={() => navigation.navigate('Kanban')}
            >
              <Ionicons name="apps" size={28} color="#34C759" />
              <Text style={[styles.actionText, { color: theme.text }]}>Tablero</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: '#F59E0B20' }]}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Ionicons name="calendar" size={28} color="#F59E0B" />
              <Text style={[styles.actionText, { color: theme.text }]}>Calendario</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal: seleccionar tarea del director para mensajear */}
      <Modal
        visible={!!selectedDirector}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDirector(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                  {selectedDirector?.displayName || selectedDirector?.email}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  Selecciona una tarea para enviar mensaje
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDirector(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {tasks
                .filter(t =>
                  (Array.isArray(t.assignedTo)
                    ? t.assignedTo.some(e => e?.toLowerCase() === selectedDirector?.email?.toLowerCase())
                    : t.assignedTo?.toLowerCase() === selectedDirector?.email?.toLowerCase()
                  ) || t.area === selectedDirector?.area
                )
                .filter(t => t.status !== 'cerrada')
                .slice(0, 15)
                .map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskRow, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSelectedDirector(null);
                      navigation.navigate('TaskChat', { taskId: task.id, taskTitle: task.title });
                    }}
                  >
                    <View style={[styles.taskStatusIcon, {
                      backgroundColor: task.status === 'en_proceso' ? '#3B82F620'
                        : task.status === 'en_revision' ? '#9C27B020' : '#F59E0B20'
                    }]}>
                      <Ionicons
                        name={task.status === 'en_proceso' ? 'play-circle' : task.status === 'en_revision' ? 'eye' : 'time'}
                        size={16}
                        color={task.status === 'en_proceso' ? '#3B82F6' : task.status === 'en_revision' ? '#9C27B0' : '#F59E0B'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.taskRowTitle, { color: theme.text }]} numberOfLines={1}>{task.title}</Text>
                      <Text style={[styles.taskRowArea, { color: theme.textSecondary }]} numberOfLines={1}>{task.area || 'Sin área'}</Text>
                    </View>
                    <Ionicons name="chatbubble-outline" size={18} color="#3B82F6" />
                  </TouchableOpacity>
                ))}

              {tasks.filter(t =>
                (Array.isArray(t.assignedTo)
                  ? t.assignedTo.some(e => e?.toLowerCase() === selectedDirector?.email?.toLowerCase())
                  : t.assignedTo?.toLowerCase() === selectedDirector?.email?.toLowerCase()
                ) || t.area === selectedDirector?.area
              ).filter(t => t.status !== 'cerrada').length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={40} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin tareas activas</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 64 - 30) / 4,
    minWidth: 70,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  completionSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 14,
  },
  completionValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  coordinationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  coordinationInfo: {
    flex: 1,
  },
  coordinationValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  coordinationLabel: {
    fontSize: 13,
  },
  coordinationStats: {
    justifyContent: 'center',
    gap: 8,
  },
  coordinationStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordinationStatText: {
    fontSize: 13,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  directorCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  directorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  directorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  directorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  directorArea: {
    fontSize: 12,
    marginTop: 2,
  },
  complianceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  complianceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  directorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  directorActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  directorActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  taskStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskRowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskRowArea: {
    fontSize: 12,
    marginTop: 2,
  },
  directorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  directorStat: {
    alignItems: 'center',
  },
  directorStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  directorStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  // Estilos para Resumen del Área
  areaSummaryCard: {
    padding: 4,
  },
  areaSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  areaSummaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  areaSummaryValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  areaSummaryLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  areaSummaryProgress: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  areaSummaryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  areaSummaryProgressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  areaSummaryProgressValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  directionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  directionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  directionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  directionStats: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: (width - 64 - 12) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
