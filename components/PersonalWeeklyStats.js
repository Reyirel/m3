// components/PersonalWeeklyStats.js
// Widget de estadísticas personales - "Tu productividad esta semana"
// Colapsable y con actualización en tiempo real

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedNumber from './AnimatedNumber';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toMs } from '../utils/dateUtils';

// Habilitar LayoutAnimation en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

Dimensions.get('window');

/**
 * PersonalWeeklyStats - Muestra estadísticas de productividad personal de la semana
 * @param {Array} tasks - Lista de tareas del usuario
 * @param {string} userId - ID del usuario actual (email)
 * @param {string} userName - Nombre para mostrar
 * @param {string} userRole - Rol del usuario ('admin', 'secretario', 'director', etc.)
 */
function PersonalWeeklyStats({ tasks = [], userId, _userName = 'tu', userRole = '' }) {
  const { theme, isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const heightAnim = useRef(new Animated.Value(1)).current;

  // Cargar estado colapsado guardado
  useEffect(() => {
    AsyncStorage.getItem('@weekly_stats_collapsed').then(val => {
      if (val === 'true') {
        setIsCollapsed(true);
        rotateAnim.setValue(1);
        heightAnim.setValue(0);
      }
    });
  }, [heightAnim, rotateAnim]);

  // Toggle colapsar con animación
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    AsyncStorage.setItem('@weekly_stats_collapsed', newState.toString());
    
    // Animar icono de chevron
    Animated.timing(rotateAnim, {
      toValue: newState ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animar altura del contenido
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-90deg'],
  });
  
  // Calcular estadísticas de la semana actual
  const weeklyStats = useMemo(() => {
    // theme is used below for moodColor — access via closure
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    // Filtrar tareas del usuario
    // Si es admin, mostrar todas las tareas
    // Si no, filtrar por tareas asignadas al usuario
    const isAdmin = userRole === 'admin';
    const userEmailLower = userId?.toLowerCase() || '';
    
    const myTasks = tasks.filter(t => {
      if (isAdmin) return true; // Admin ve todas las tareas
      
      // Verificar si está asignada al usuario
      if (Array.isArray(t.assignedTo)) {
        return t.assignedTo.some(email => email?.toLowerCase() === userEmailLower);
      }
      if (typeof t.assignedTo === 'string') {
        return t.assignedTo.toLowerCase() === userEmailLower;
      }
      if (t.assignedEmails && Array.isArray(t.assignedEmails)) {
        return t.assignedEmails.some(email => email?.toLowerCase() === userEmailLower);
      }
      return false;
    });
    
    // Tareas completadas (todas las cerradas, no solo esta semana)
    const completed = myTasks.filter(t => t.status === 'cerrada' || t.status === 'completada');
    
    // Tareas completadas específicamente esta semana (para el cálculo de productividad)
    const completedThisWeek = completed.filter(t => {
      const completedAt = t.completedAt ? new Date(toMs(t.completedAt)) : 
                         t.updatedAt ? new Date(toMs(t.updatedAt)) : null;
      return completedAt && completedAt >= startOfWeek && completedAt < endOfWeek;
    });
    
    // Tareas a tiempo vs tarde
    const onTime = completedThisWeek.filter(t => {
      if (!t.dueAt) return true;
      const completedAt = t.completedAt ? new Date(toMs(t.completedAt)) : new Date(toMs(t.updatedAt));
      return completedAt <= new Date(toMs(t.dueAt));
    });
    
    // Tareas pendientes (activas)
    const pending = myTasks.filter(t => 
      t.status === 'pendiente' || 
      t.status === 'en_proceso' || 
      t.status === 'en_revision'
    );
    
    // Tareas vencidas
    const overdue = pending.filter(t => {
      if (!t.dueAt) return false;
      return new Date(toMs(t.dueAt)) < now;
    });
    
    // Tareas próximas (próximos 3 días)
    const upcoming = pending.filter(t => {
      if (!t.dueAt) return false;
      const dueDate = new Date(toMs(t.dueAt));
      const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      return dueDate >= now && dueDate <= in3Days;
    });
    
    // Calcular streak (días consecutivos completando tareas)
    const dailyCompletions = {};
    completedThisWeek.forEach(t => {
      const date = (t.completedAt || t.updatedAt);
      if (date) {
        const day = new Date(toMs(date)).toDateString();
        dailyCompletions[day] = (dailyCompletions[day] || 0) + 1;
      }
    });
    const daysWithCompletions = Object.keys(dailyCompletions).length;
    
    // Puntuación de productividad (0-100)
    const productivityScore = Math.min(100, Math.round(
      (completedThisWeek.length * 15) + // +15 por cada completada
      (onTime.length * 10) + // +10 extra por a tiempo
      (daysWithCompletions * 5) - // +5 por día activo
      (overdue.length * 20) // -20 por cada vencida
    ));
    
    // Determinar estado del ánimo
    let mood;
    let moodIcon;
    let moodColor;
    let moodMessage;

    if (productivityScore >= 80) {
      mood = 'excellent';
      moodIcon = 'rocket';
      moodColor = theme.success;
      moodMessage = '¡Semana excelente!';
    } else if (productivityScore >= 60) {
      mood = 'good';
      moodIcon = 'thumbs-up';
      moodColor = theme.info;
      moodMessage = '¡Vas muy bien!';
    } else if (productivityScore >= 40) {
      mood = 'neutral';
      moodIcon = 'fitness';
      moodColor = theme.warning;
      moodMessage = 'Puedes mejorar';
    } else {
      mood = 'low';
      moodIcon = 'cafe';
      moodColor = theme.error;
      moodMessage = 'Enfócate esta semana';
    }
    
    return {
      completed: completed.length,
      onTime: onTime.length,
      pending: pending.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
      daysActive: daysWithCompletions,
      score: Math.max(0, productivityScore),
      mood,
      moodIcon,
      moodColor,
      moodMessage,
    };
  }, [tasks, userId, userRole, theme]);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Obtener día de la semana
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date().getDay();

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
      {/* Header - Clickable para colapsar */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleCollapse}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="bar-chart" size={20} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Tu semana</Text>
          <Animated.View style={{ transform: [{ rotate: chevronRotation }], marginLeft: 4 }}>
            <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
          </Animated.View>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: weeklyStats.moodColor + '20' }]}>
          <Ionicons name={weeklyStats.moodIcon} size={16} color={weeklyStats.moodColor} />
          <AnimatedNumber
            value={weeklyStats.score}
            duration={800}
            style={[styles.scoreText, { color: weeklyStats.moodColor }]}
            delay={200}
          />
        </View>
      </TouchableOpacity>

      {/* Contenido colapsable */}
      {!isCollapsed && (
        <>
          {/* Mensaje motivacional */}
          <View style={[styles.moodBanner, { backgroundColor: weeklyStats.moodColor + '15' }]}>
            <Ionicons name={weeklyStats.moodIcon} size={24} color={weeklyStats.moodColor} />
            <Text style={[styles.moodMessage, { color: weeklyStats.moodColor }]}>
              {weeklyStats.moodMessage}
            </Text>
          </View>

          {/* Métricas principales */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: theme.successAlpha }]}>
                <Ionicons name="checkmark-done" size={18} color={theme.success} />
              </View>
              <AnimatedNumber
                value={weeklyStats.completed}
                duration={600}
                delay={100}
                style={[styles.metricValue, { color: theme.text }]}
              />
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Completadas</Text>
            </View>
            
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: theme.infoAlpha }]}>
                <Ionicons name="hourglass" size={18} color={theme.info} />
              </View>
              <AnimatedNumber
                value={weeklyStats.pending}
                duration={600}
                delay={200}
                style={[styles.metricValue, { color: theme.text }]}
              />
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Pendientes</Text>
            </View>
            
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: theme.errorAlpha }]}>
                <Ionicons name="alert-circle" size={18} color={theme.error} />
              </View>
              <AnimatedNumber
                value={weeklyStats.overdue}
                duration={600}
                delay={300}
                style={[styles.metricValue, { color: theme.text }]}
              />
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Vencidas</Text>
            </View>
            
            <View style={styles.metricItem}>
              <View style={[styles.metricIcon, { backgroundColor: theme.warningAlpha }]}>
                <Ionicons name="calendar" size={18} color={theme.warning} />
              </View>
              <AnimatedNumber
                value={weeklyStats.upcoming}
                duration={600}
                delay={400}
                style={[styles.metricValue, { color: theme.text }]}
              />
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Próximas</Text>
            </View>
          </View>

          {/* Días de la semana - indicador visual */}
          <View style={styles.weekDays}>
            {dayNames.map((day, index) => {
              const isToday = index === today;
              const isPast = index < today;
              
              return (
                <View 
                  key={day} 
                  style={[
                    styles.dayCircle,
                    isToday && styles.dayCircleToday,
                    { 
                      backgroundColor: isToday ? theme.primary :
                                       isPast ? theme.border :
                                       (isDark ? theme.glass : theme.glassStrong),
                    }
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                  ]}>
                    {day}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Barra de progreso de a tiempo */}
          {weeklyStats.completed > 0 && (
            <View style={styles.onTimeProgress}>
              <View style={styles.onTimeHeader}>
                <Text style={[styles.onTimeLabel, { color: theme.textSecondary }]}>
                  Completadas a tiempo
                </Text>
                <Text style={[styles.onTimeValue, { color: theme.success }]}>
                  {weeklyStats.onTime}/{weeklyStats.completed}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(weeklyStats.onTime / weeklyStats.completed) * 100}%`,
                      backgroundColor: theme.success
                    }
                  ]}
                />
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default React.memo(PersonalWeeklyStats);

const createStyles = (_theme, _isDark) => StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  moodBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  moodMessage: {
    fontSize: 15,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleToday: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  onTimeProgress: {
    marginTop: 4,
  },
  onTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  onTimeLabel: {
    fontSize: 12,
  },
  onTimeValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
