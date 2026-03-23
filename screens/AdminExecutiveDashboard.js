// screens/AdminExecutiveDashboard.js
// Dashboard ÚNICO y UNIFICADO para Admin
// Combina: KPIs, Evolución, Comparativa, Cumplimiento, Rendimiento

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
const LineChart = React.lazy(() => import('react-native-chart-kit').then(module => ({ default: module.LineChart })));
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import ProgressBar from '../components/ProgressBar';
import Avatar from '../components/Avatar';
import ShimmerEffect from '../components/ShimmerEffect';
import TrafficLightDashboard from '../components/TrafficLightDashboard';
import { toMs } from '../utils/dateUtils';
import { resolveAreaName } from '../config/areas';
import { useResponsive } from '../utils/responsive';
import { MAX_WIDTHS } from '../theme/tokens';

const { width } = Dimensions.get('window');
const chartWidth = Math.min(width - 48, 500);

export default function AdminExecutiveDashboard({ navigation }) {
  const { theme, isDark } = useTheme();
  const { isDesktop } = useResponsive();
  const { tasks } = useTasks();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, compliance, trafficlight
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // week, month, quarter
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [complianceView, setComplianceView] = useState('directors'); // directors | secretarios
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ⚠️ En web, useNativeDriver puede causar problemas
  const useNativeDriver = Platform.OS !== 'web';

  // === MÉTRICAS CALCULADAS ===
  
  // Métricas globales
  const globalMetrics = useMemo(() => {
    if (!tasks.length) return {
      totalTasks: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0,
      overdueTasks: 0, coordinationTasks: 0, completionRate: 0, onTimeRate: 0,
    };
    
    const now = new Date();
    const pending = tasks.filter(t => t.status === 'pendiente');
    const inProgress = tasks.filter(t => t.status === 'en_proceso' || t.status === 'en_progreso' || t.status === 'en-progreso');
    const completed = tasks.filter(t => t.status === 'completada' || t.status === 'cerrada');
    const overdue = tasks.filter(t => {
      if (t.status === 'completada' || t.status === 'cerrada') return false;
      const dueDate = t.dueAt ? new Date(toMs(t.dueAt)) : null;
      return dueDate && dueDate < now;
    });
    const coordination = tasks.filter(t => t.isCoordinationTask);
    
    const completedOnTime = completed.filter(t => {
      if (!t.dueAt || !t.completedAt) return true;
      return toMs(t.completedAt) <= toMs(t.dueAt);
    });
    
    return {
      totalTasks: tasks.length,
      pendingTasks: pending.length,
      inProgressTasks: inProgress.length,
      completedTasks: completed.length,
      overdueTasks: overdue.length,
      coordinationTasks: coordination.length,
      completionRate: tasks.length > 0 
        ? Math.round((completed.length / tasks.length) * 100) 
        : 0,
      onTimeRate: completed.length > 0 
        ? Math.round((completedOnTime.length / completed.length) * 100) 
        : 0,
    };
  }, [tasks]);

  // Datos para gráfica de evolución
  const evolutionData = useMemo(() => {
    if (!tasks.length) return null;
    
    const now = new Date();
    const labels = [];
    const completedData = [];
    const createdData = [];
    
    // Últimos 7 días o 4 semanas según período
    const periods = selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 4 : 12;
    const periodType = selectedPeriod === 'week' ? 'day' : selectedPeriod === 'month' ? 'week' : 'month';
    
    for (let i = periods - 1; i >= 0; i--) {
      let startDate, endDate, label;
      
      if (periodType === 'day') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - i);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        label = startDate.toLocaleDateString('es', { weekday: 'short' });
      } else if (periodType === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - (i * 7));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        label = `Sem ${periods - i}`;
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        label = startDate.toLocaleDateString('es', { month: 'short' });
      }
      
      const completedInPeriod = tasks.filter(t => {
        if (t.status !== 'completada' && t.status !== 'cerrada') return false;
        const completedAt = t.completedAt ? new Date(toMs(t.completedAt)) : null;
        return completedAt && completedAt >= startDate && completedAt <= endDate;
      });
      
      const createdInPeriod = tasks.filter(t => {
        const createdAt = t.createdAt ? new Date(toMs(t.createdAt)) : null;
        return createdAt && createdAt >= startDate && createdAt <= endDate;
      });
      
      labels.push(label);
      completedData.push(completedInPeriod.length);
      createdData.push(createdInPeriod.length);
    }
    
    return { labels, completedData, createdData };
  }, [tasks, selectedPeriod]);

  // Comparativa mensual
  const monthlyComparison = useMemo(() => {
    if (!tasks.length) return { thisMonth: 0, lastMonth: 0, change: 0, improving: false };
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    
    const thisMonthCompleted = tasks.filter(t => {
      if (t.status !== 'completada' && t.status !== 'cerrada') return false;
      const completedAt = t.completedAt ? new Date(toMs(t.completedAt)) : null;
      return completedAt && completedAt >= thisMonthStart;
    });
    
    const lastMonthCompleted = tasks.filter(t => {
      if (t.status !== 'completada' && t.status !== 'cerrada') return false;
      const completedAt = t.completedAt ? new Date(toMs(t.completedAt)) : null;
      return completedAt && completedAt >= lastMonthStart && completedAt <= lastMonthEnd;
    });
    
    const thisMonthRate = thisMonthCompleted.length;
    const lastMonthRate = lastMonthCompleted.length;
    const change = lastMonthRate > 0 
      ? Math.round(((thisMonthRate - lastMonthRate) / lastMonthRate) * 100) 
      : thisMonthRate > 0 ? 100 : 0;
    
    return {
      thisMonth: thisMonthRate,
      lastMonth: lastMonthRate,
      change,
      improving: change >= 0,
    };
  }, [tasks]);

  // Métricas por usuario (para cumplimiento)
  const userMetrics = useMemo(() => {
    const directores = users.filter(u => u.role === 'director');
    const now = new Date();
    
    return directores.map(user => {
      const userTasks = tasks.filter(t => 
        (Array.isArray(t.assignedTo) 
          ? t.assignedTo.some(e => (typeof e === 'string' ? e : e?.email || '').toLowerCase().trim() === user.email?.toLowerCase().trim())
          : t.assignedTo?.toLowerCase().trim() === user.email?.toLowerCase().trim()) || resolveAreaName(t.area) === resolveAreaName(user.area)
      );
      const completed = userTasks.filter(t => t.status === 'completada' || t.status === 'cerrada');
      const pending = userTasks.filter(t => t.status === 'pendiente');
      const overdue = userTasks.filter(t => {
        if (t.status === 'completada' || t.status === 'cerrada') return false;
        const dueDate = t.dueAt ? new Date(toMs(t.dueAt)) : null;
        return dueDate && dueDate < now;
      });
      
      return {
        ...user,
        totalTasks: userTasks.length,
        completedTasks: completed.length,
        pendingTasks: pending.length,
        overdueTasks: overdue.length,
        completionRate: userTasks.length > 0 
          ? Math.round((completed.length / userTasks.length) * 100) 
          : 0,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [tasks, users]);

  // Top áreas con más vencidas (para el overview)
  const topOverdueAreas = useMemo(() => {
    const now = Date.now();
    const counts = {};
    tasks.filter(t => t.status !== 'cerrada' && t.area && toMs(t.dueAt) < now).forEach(t => {
      counts[t.area] = (counts[t.area] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [tasks]);

  // Métricas por secretaría
  const secretariaMetrics = useMemo(() => {
    const secretarios = users.filter(u => u.role === 'secretario');
    const directores = users.filter(u => u.role === 'director');
    const now = new Date();
    
    return secretarios.map(sec => {
      const direcciones = sec.direcciones || [];
      const secArea = sec.area || '';
      
      const secTasks = tasks.filter(t => {
        const taskArea = t.area || '';
        const taskAreas = t.areas || [taskArea];
        return direcciones.some(dir => taskAreas.map(a => resolveAreaName(a)).includes(resolveAreaName(dir)) || resolveAreaName(taskArea) === resolveAreaName(dir)) ||
               resolveAreaName(taskArea).includes(resolveAreaName(secArea));
      });
      
      const secDirectors = directores.filter(d =>
        direcciones.map(resolveAreaName).includes(resolveAreaName(d.area)) ||
        direcciones.map(resolveAreaName).includes(resolveAreaName(d.department))
      );
      
      const secCompleted = secTasks.filter(t => t.status === 'completada' || t.status === 'cerrada');
      const secOverdue = secTasks.filter(t => {
        if (t.status === 'completada' || t.status === 'cerrada') return false;
        const dueDate = t.dueAt ? new Date(toMs(t.dueAt)) : null;
        return dueDate && dueDate < now;
      });
      
      return {
        secretario: sec,
        totalTasks: secTasks.length,
        completedTasks: secCompleted.length,
        overdueTasks: secOverdue.length,
        pendingTasks: secTasks.filter(t => t.status === 'pendiente').length,
        completionRate: secTasks.length > 0 
          ? Math.round((secCompleted.length / secTasks.length) * 100) 
          : 0,
        directorsCount: secDirectors.length,
        directors: secDirectors,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [tasks, users]);

  // === EFECTOS ===
  
  useEffect(() => {
    let mounted = true;

    // onSnapshot dispara inmediatamente con el estado actual, no necesita getDocs previo
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      if (!mounted) return;
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      if (__DEV__) console.error('Error loading users:', error);
      if (mounted) setLoading(false);
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver }),
    ]).start();

    return () => {
      mounted = false;
      if (unsubscribeUsers) unsubscribeUsers();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, []);

  // === UTILIDADES ===
  
  const getCompletionColor = (rate) => {
    if (rate >= 80) return '#10B981';
    if (rate >= 60) return '#F59E0B';
    if (rate >= 40) return '#F97316';
    return '#EF4444';
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'secretario': return 'Secretario';
      case 'director': return 'Director';
      default: return 'Director';
    }
  };

  // === COMPONENTES DE TABS ===
  
  const TabButton = ({ id, label, icon }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === id && { backgroundColor: theme.primary + '20', borderColor: theme.primary },
      ]}
      onPress={() => setActiveTab(id)}
    >
      <Ionicons 
        name={icon} 
        size={18} 
        color={activeTab === id ? theme.primary : theme.textSecondary} 
      />
      <Text style={[
        styles.tabLabel,
        { color: activeTab === id ? theme.primary : theme.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // === SECCIONES ===
  
  // Sección: Resumen General
  const renderOverview = () => (
    <View>
      {/* KPIs principales + tasas en una sola card */}
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.kpiGrid}>
          {[
            { label: 'Total', value: globalMetrics.totalTasks, color: theme.text, bg: isDark ? '#1E293B' : '#F8FAFC', icon: 'document-text', iconColor: '#3B82F6' },
            { label: 'Completadas', value: globalMetrics.completedTasks, color: '#10B981', bg: isDark ? '#162118' : '#ECFDF5', icon: 'checkmark-circle', iconColor: '#10B981' },
            { label: 'En progreso', value: globalMetrics.inProgressTasks, color: '#3B82F6', bg: isDark ? '#162030' : '#EFF6FF', icon: 'sync', iconColor: '#3B82F6' },
            { label: 'Vencidas', value: globalMetrics.overdueTasks, color: '#EF4444', bg: isDark ? '#2D1515' : '#FEF2F2', icon: 'alert-circle', iconColor: '#EF4444' },
          ].map(kpi => (
            <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: kpi.bg }]}>
              <Ionicons name={kpi.icon} size={20} color={kpi.iconColor} style={{ marginBottom: 6 }} />
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Tasas de cumplimiento */}
        <View style={[styles.ratesContainer, { marginTop: 4 }]}>
          {[
            { label: 'Cumplimiento', value: globalMetrics.completionRate },
            { label: 'A tiempo', value: globalMetrics.onTimeRate },
          ].map(rate => (
            <View key={rate.label} style={styles.rateItem}>
              <View style={styles.rateHeader}>
                <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>{rate.label}</Text>
                <Text style={[styles.rateValue, { color: getCompletionColor(rate.value) }]}>{rate.value}%</Text>
              </View>
              <ProgressBar progress={rate.value} color={getCompletionColor(rate.value)} size="medium" />
            </View>
          ))}
        </View>

        {/* Comparativa mes actual vs anterior — inline compacta */}
        <View style={[styles.compactComparison, { borderTopColor: theme.border, marginTop: 14, paddingTop: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trending-up" size={14} color="#9C27B0" />
            <Text style={[styles.compactCompLabel, { color: theme.textSecondary }]}>Este mes vs anterior</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[styles.compactCompValue, { color: theme.text }]}>
              {monthlyComparison.thisMonth}
            </Text>
            <Text style={[styles.compactCompSep, { color: theme.textSecondary }]}>vs</Text>
            <Text style={[styles.compactCompValue, { color: theme.textSecondary }]}>
              {monthlyComparison.lastMonth}
            </Text>
            <View style={[styles.compactBadge, { backgroundColor: monthlyComparison.improving ? '#10B98120' : '#EF444420' }]}>
              <Ionicons name={monthlyComparison.improving ? 'arrow-up' : 'arrow-down'} size={11} color={monthlyComparison.improving ? '#10B981' : '#EF4444'} />
              <Text style={{ color: monthlyComparison.improving ? '#10B981' : '#EF4444', fontSize: 11, fontWeight: '700' }}>
                {monthlyComparison.change > 0 ? '+' : ''}{monthlyComparison.change}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Áreas con más vencidas */}
      {topOverdueAreas.length > 0 && (
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={18} color="#EF4444" />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Áreas con más retrasos</Text>
          </View>
          {topOverdueAreas.map(([area, count]) => (
            <View key={area} style={[styles.rateItem, { marginTop: 8 }]}>
              <View style={styles.rateHeader}>
                <Text style={[styles.rateLabel, { color: theme.text }]} numberOfLines={1}>{area}</Text>
                <Text style={[styles.rateValue, { color: '#EF4444' }]}>{count} vencida{count !== 1 ? 's' : ''}</Text>
              </View>
              <ProgressBar
                progress={Math.min(100, (count / Math.max(globalMetrics.overdueTasks, 1)) * 100)}
                color="#EF4444"
                size="small"
              />
            </View>
          ))}
        </View>
      )}

      {/* Botón para ver evolución histórica */}
      <TouchableOpacity
        style={[styles.evolutionButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setShowEvolutionModal(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: '#3B82F620', padding: 8, borderRadius: 10 }}>
            <Ionicons name="analytics" size={18} color="#3B82F6" />
          </View>
          <View>
            <Text style={[{ fontSize: 14, fontWeight: '700', color: theme.text }]}>Evolución histórica</Text>
            <Text style={[{ fontSize: 12, color: theme.textSecondary }]}>Ver gráfica de tareas por período</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  // Sección: Evolución
  const renderEvolution = () => (
    <View style={[styles.section, { backgroundColor: theme.card }]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="analytics" size={20} color="#3B82F6" />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Evolución</Text>
      </View>
      
      {/* Selector de período */}
      <View style={styles.periodSelector}>
        {['week', 'month', 'quarter'].map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodButtonText,
              { color: selectedPeriod === period ? '#FFFFFF' : theme.textSecondary }
            ]}>
              {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Trimestre'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {evolutionData && evolutionData.completedData.some(v => v > 0) ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: evolutionData.labels,
              datasets: [
                { data: evolutionData.completedData.length ? evolutionData.completedData : [0], color: () => '#10B981', strokeWidth: 3 },
                { data: evolutionData.createdData.length ? evolutionData.createdData : [0], color: () => '#3B82F6', strokeWidth: 2 },
              ],
              legend: ['Completadas', 'Creadas'],
            }}
            width={chartWidth}
            height={200}
            chartConfig={{
              backgroundColor: theme.card,
              backgroundGradientFrom: theme.card,
              backgroundGradientTo: theme.card,
              decimalPlaces: 0,
              color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              labelColor: () => theme.textSecondary,
              propsForDots: { r: '4', strokeWidth: '2' },
            }}
            bezier
            style={{ borderRadius: 12 }}
          />
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Ionicons name="analytics-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyChartText, { color: theme.textSecondary }]}>
            Sin datos para mostrar en este período
          </Text>
        </View>
      )}
      
      {/* Leyenda */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Completadas</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Creadas</Text>
        </View>
      </View>
    </View>
  );

  // Sección: Cumplimiento + Secretarías (unificada con toggle)
  const renderCompliance = () => {
    const isDirectors = complianceView === 'directors';
    const activeMetrics = isDirectors ? userMetrics : secretariaMetrics;
    const avgRate = isDirectors
      ? (userMetrics.length > 0 ? Math.round(userMetrics.reduce((a, b) => a + b.completionRate, 0) / userMetrics.length) : 0)
      : (secretariaMetrics.length > 0 ? Math.round(secretariaMetrics.reduce((a, b) => a + b.completionRate, 0) / secretariaMetrics.length) : 0);

    return (
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        {/* Toggle Directores / Secretarías */}
        <View style={[styles.segmentToggle, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
          {[
            { key: 'directors', label: 'Directores', icon: 'people' },
            { key: 'secretarios', label: 'Secretarías', icon: 'business' },
          ].map(seg => (
            <TouchableOpacity
              key={seg.key}
              style={[styles.segmentBtn, complianceView === seg.key && { backgroundColor: theme.card, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }]}
              onPress={() => setComplianceView(seg.key)}
            >
              <Ionicons name={seg.icon} size={14} color={complianceView === seg.key ? theme.primary : theme.textSecondary} />
              <Text style={[styles.segmentBtnText, { color: complianceView === seg.key ? theme.primary : theme.textSecondary }]}>{seg.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Resumen en 3 chips */}
        <View style={[styles.complianceSummary, { marginTop: 14 }]}>
          <View style={[styles.complianceCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
            <Text style={[styles.complianceValue, { color: theme.text }]}>{activeMetrics.length}</Text>
            <Text style={[styles.complianceLabel, { color: theme.textSecondary }]}>Total</Text>
          </View>
          <View style={[styles.complianceCard, { backgroundColor: isDark ? '#1E2620' : '#ECFDF5' }]}>
            <Text style={[styles.complianceValue, { color: '#10B981' }]}>{avgRate}%</Text>
            <Text style={[styles.complianceLabel, { color: theme.textSecondary }]}>Promedio</Text>
          </View>
          <View style={[styles.complianceCard, { backgroundColor: isDark ? '#2D1E1E' : '#FEF2F2' }]}>
            <Text style={[styles.complianceValue, { color: '#EF4444' }]}>
              {isDirectors
                ? userMetrics.filter(u => u.overdueTasks > 0).length
                : secretariaMetrics.filter(s => s.overdueTasks > 0).length}
            </Text>
            <Text style={[styles.complianceLabel, { color: theme.textSecondary }]}>Con retrasos</Text>
          </View>
        </View>

        {/* Lista */}
        <View style={[styles.usersList, { marginTop: 14 }]}>
          {activeMetrics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Sin datos</Text>
            </View>
          ) : isDirectors ? (
            userMetrics.map((user, index) => (
              <TouchableOpacity
                key={user.id || index}
                style={[styles.userCard, { backgroundColor: isDark ? '#1E1E23' : '#F8FAFC', borderLeftColor: getCompletionColor(user.completionRate) }]}
                onPress={() => { setSelectedUser(user); setShowUserModal(true); }}
              >
                <Text style={[styles.rankNumber, { color: index < 3 ? '#F59E0B' : theme.textSecondary, width: 24 }]}>#{index + 1}</Text>
                <Avatar name={user.displayName || user.email} size={36} />
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>{user.displayName || user.email?.split('@')[0]}</Text>
                  <Text style={[styles.userRole, { color: theme.textSecondary }]} numberOfLines={1}>{user.area || 'Sin área'}</Text>
                </View>
                <View style={styles.userStats}>
                  <Text style={[styles.userRate, { color: getCompletionColor(user.completionRate) }]}>{user.completionRate}%</Text>
                  {user.overdueTasks > 0 && <Text style={styles.overdueText}>{user.overdueTasks} venc.</Text>}
                </View>
              </TouchableOpacity>
            ))
          ) : (
            secretariaMetrics.map((data, index) => (
              <TouchableOpacity
                key={data.secretario.id || index}
                style={[styles.secretariaCard, { backgroundColor: isDark ? '#1E1E23' : '#F8FAFC', borderLeftColor: getCompletionColor(data.completionRate) }]}
                onPress={() => { setSelectedUser({ ...data.secretario, ...data }); setShowUserModal(true); }}
              >
                <View style={styles.secretariaHeader}>
                  <Avatar name={data.secretario.displayName || data.secretario.email} size={40} />
                  <View style={styles.secretariaInfo}>
                    <Text style={[styles.secretariaName, { color: theme.text }]} numberOfLines={1}>{data.secretario.displayName || data.secretario.email?.split('@')[0]}</Text>
                    <Text style={[styles.secretariaArea, { color: theme.textSecondary }]} numberOfLines={1}>{data.secretario.area || 'Sin área'}</Text>
                  </View>
                  <Text style={[styles.scoreValue, { color: getCompletionColor(data.completionRate) }]}>{data.completionRate}%</Text>
                </View>
                <View style={styles.secretariaStats}>
                  {[
                    { v: data.totalTasks, l: 'Total', c: theme.text },
                    { v: data.completedTasks, l: 'Compl.', c: '#10B981' },
                    { v: data.overdueTasks, l: 'Vencidas', c: '#EF4444' },
                    { v: data.directorsCount, l: 'Direct.', c: '#3B82F6' },
                  ].map((s, i, arr) => (
                    <React.Fragment key={s.l}>
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: s.c }]}>{s.v}</Text>
                        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{s.l}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={styles.statDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    );
  };

  // === RENDER PRINCIPAL ===
  
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header shimmer */}
        <LinearGradient
          colors={['#9F2241', '#BC955C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingBottom: 20 }]}
        >
          <ShimmerEffect width={140} height={14} borderRadius={6} style={{ marginBottom: 8 }} />
          <ShimmerEffect width={220} height={24} borderRadius={8} />
        </LinearGradient>
        {/* Body shimmer */}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} scrollEnabled={false}>
          {/* KPI cards */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[...Array(4)].map((_, i) => (
              <ShimmerEffect key={i} width={(width - 52) / 2} height={90} borderRadius={14} />
            ))}
          </View>
          {/* Chart area */}
          <ShimmerEffect width="100%" height={200} borderRadius={16} />
          {/* Stats rows */}
          {[...Array(5)].map((_, i) => (
            <ShimmerEffect key={i} width="100%" height={64} borderRadius={12} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
      {/* Header */}
      <LinearGradient
        colors={['#9F2241', '#BC955C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerLabel}>PANEL DE CONTROL</Text>
            <Text style={styles.headerTitle}>Dashboard Admin</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{globalMetrics.totalTasks}</Text>
              <Text style={styles.headerBadgeLabel}>tareas</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs de navegación — 3 tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.tabsScroll}>
          <TabButton id="overview" label="Resumen" icon="grid" />
          <TabButton id="compliance" label="Personas" icon="people" />
          <TabButton id="trafficlight" label="Semáforo" icon="radio-button-on" />
        </View>
      </View>

      {/* Contenido */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'compliance' && renderCompliance()}
          {activeTab === 'trafficlight' && (
            <TrafficLightDashboard
              tasks={tasks}
              onAreaPress={(area) => navigation.navigate('Tasks', { filterArea: area })}
            />
          )}
          <View style={{ height: 100 }} />
        </Animated.View>
      </ScrollView>

      </View>{/* end contentWrapper */}

      {/* Modal de Evolución */}
      <Modal visible={showEvolutionModal} animationType="slide" transparent onRequestClose={() => setShowEvolutionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Evolución histórica</Text>
              <TouchableOpacity onPress={() => setShowEvolutionModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {renderEvolution()}
          </View>
        </View>
      </Modal>

      {/* Modal de detalle de usuario */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Detalle</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedUser && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalUserInfo}>
                  <Avatar name={selectedUser.displayName || selectedUser.email} size={64} />
                  <Text style={[styles.modalUserName, { color: theme.text }]}>
                    {selectedUser.displayName || selectedUser.email?.split('@')[0]}
                  </Text>
                  <Text style={[styles.modalUserRole, { color: theme.textSecondary }]}>
                    {getRoleLabel(selectedUser.role)} · {selectedUser.area || 'Sin área'}
                  </Text>
                </View>
                
                <View style={styles.modalStats}>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                    <Text style={[styles.modalStatValue, { color: theme.text }]}>{selectedUser.totalTasks || 0}</Text>
                    <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Total</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#1E2620' : '#ECFDF5' }]}>
                    <Text style={[styles.modalStatValue, { color: '#10B981' }]}>{selectedUser.completedTasks || 0}</Text>
                    <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Completadas</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: isDark ? '#2D1E1E' : '#FEF2F2' }]}>
                    <Text style={[styles.modalStatValue, { color: '#EF4444' }]}>{selectedUser.overdueTasks || 0}</Text>
                    <Text style={[styles.modalStatLabel, { color: theme.textSecondary }]}>Vencidas</Text>
                  </View>
                </View>
                
                <View style={styles.modalCompletion}>
                  <View style={styles.modalCompletionHeader}>
                    <Text style={[styles.modalCompletionLabel, { color: theme.textSecondary }]}>
                      Tasa de Cumplimiento
                    </Text>
                    <Text style={[styles.modalCompletionValue, { color: getCompletionColor(selectedUser.completionRate || 0) }]}>
                      {selectedUser.completionRate || 0}%
                    </Text>
                  </View>
                  <ProgressBar 
                    progress={selectedUser.completionRate || 0} 
                    color={getCompletionColor(selectedUser.completionRate || 0)}
                    size="large"
                  />
                </View>
                
                {/* Directores si es secretario */}
                {selectedUser.directors && selectedUser.directors.length > 0 && (
                  <View style={styles.modalDirectors}>
                    <Text style={[styles.modalDirectorsTitle, { color: theme.text }]}>
                      Directores ({selectedUser.directors.length})
                    </Text>
                    {selectedUser.directors.map((director, i) => (
                      <View key={i} style={[styles.modalDirectorItem, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
                        <Avatar name={director.displayName || director.email} size={32} />
                        <Text style={[styles.modalDirectorName, { color: theme.text }]}>
                          {director.displayName || director.email?.split('@')[0]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: { flex: 1, alignSelf: 'center', width: '100%' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  
  // Header
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  headerBadgeText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerBadgeLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  
  // Tabs
  tabsContainer: { borderBottomWidth: 1, paddingVertical: 10 },
  tabsScroll: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, justifyContent: 'space-around' },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'transparent', gap: 6 },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  // Compact comparison (inline in overview card)
  compactComparison: { borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compactCompLabel: { fontSize: 12 },
  compactCompValue: { fontSize: 20, fontWeight: '800' },
  compactCompSep: { fontSize: 12 },
  compactBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },

  // Evolution button (in overview)
  evolutionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 16 },

  // Segment toggle (compliance tab)
  segmentToggle: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10 },
  segmentBtnText: { fontSize: 13, fontWeight: '600' },
  
  // Content
  scrollContent: { padding: 16 },
  section: { borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  sectionSubtitle: { fontSize: 12, width: '100%', marginTop: 2 },
  
  // KPIs
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: '47%', flexGrow: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
  kpiIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  kpiValue: { fontSize: 26, fontWeight: '800' },
  kpiLabel: { fontSize: 11, marginTop: 3, textAlign: 'center', fontWeight: '500' },
  
  // Rates
  ratesContainer: { gap: 12 },
  rateItem: { gap: 6 },
  rateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { fontSize: 13, fontWeight: '500' },
  rateValue: { fontSize: 16, fontWeight: '700' },
  
  // Comparison
  comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 12 },
  comparisonItem: { alignItems: 'center' },
  comparisonLabel: { fontSize: 12, marginTop: 4 },
  comparisonValue: { fontSize: 32, fontWeight: '800' },
  comparisonArrow: { width: 1, height: 40, alignSelf: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 6 },
  
  // Chart
  chartContainer: { alignItems: 'center', marginVertical: 10 },
  emptyChart: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyChartText: { fontSize: 14, textAlign: 'center' },
  periodSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  periodButtonText: { fontSize: 12, fontWeight: '600' },
  legendContainer: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
  
  // Compliance
  complianceSummary: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  complianceCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  complianceValue: { fontSize: 22, fontWeight: '800' },
  complianceLabel: { fontSize: 10, marginTop: 2 },
  sortButtons: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sortLabel: { fontSize: 12 },
  sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  sortButtonText: { fontSize: 12, fontWeight: '600' },
  
  // Users List
  usersList: { gap: 10 },
  userCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderLeftWidth: 4, gap: 10 },
  userRank: { width: 28, alignItems: 'center' },
  rankNumber: { fontSize: 12, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600' },
  userRole: { fontSize: 11, marginTop: 2 },
  userStats: { alignItems: 'flex-end' },
  userRate: { fontSize: 18, fontWeight: '800' },
  overdueBadge: { backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  overdueText: { color: '#EF4444', fontSize: 10, fontWeight: '600' },
  
  // Secretaria Cards
  secretariaCard: { padding: 14, borderRadius: 14, marginBottom: 12, borderLeftWidth: 4 },
  secretariaHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  secretariaInfo: { flex: 1, marginLeft: 10 },
  secretariaName: { fontSize: 15, fontWeight: '700' },
  secretariaArea: { fontSize: 11, marginTop: 2 },
  secretariaScore: { alignItems: 'flex-end' },
  scoreValue: { fontSize: 22, fontWeight: '800' },
  secretariaStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700' },
  statLabel: { fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  
  // Empty
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalUserInfo: { alignItems: 'center', marginBottom: 16 },
  modalUserName: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  modalUserRole: { fontSize: 13, marginTop: 4 },
  modalStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modalStatCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  modalStatValue: { fontSize: 22, fontWeight: '700' },
  modalStatLabel: { fontSize: 10, marginTop: 4 },
  modalCompletion: { marginBottom: 16 },
  modalCompletionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalCompletionLabel: { fontSize: 13 },
  modalCompletionValue: { fontSize: 18, fontWeight: '700' },
  modalDirectors: { marginTop: 8 },
  modalDirectorsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  modalDirectorItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, marginBottom: 6, gap: 10 },
  modalDirectorName: { fontSize: 13, fontWeight: '500' },
});
