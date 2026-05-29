// components/ReportDetailsModal.js
// 🎯 Modal para mostrar detalles de reportes sin sobrecargar la pantalla principal
import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../utils/responsive';

export default function ReportDetailsModal({
  visible,
  onClose,
  title,
  stats,
  type = 'general', // 'general' | 'areas' | 'priority'
}) {
  const { theme, isDark } = useTheme();
  const { padding } = useResponsive();
  const { height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, height, slideAnim]);

  const renderGeneralStats = () => (
    <View style={{ gap: 12 }}>
      <StatRow 
        label="Completadas" 
        value={stats?.completed || 0}
        color={theme.success}
        icon="checkmark-circle"
      />
      <StatRow 
        label="En Proceso" 
        value={stats?.inProgress || 0}
        color={theme.info}
        icon="time"
      />
      <StatRow 
        label="Pendientes" 
        value={stats?.pending || 0}
        color={theme.warning}
        icon="alert-circle"
      />
      <StatRow 
        label="Vencidas" 
        value={stats?.overdue || 0}
        color={theme.error}
        icon="close-circle"
      />
      {stats?.completionRate !== undefined && (
        <View style={styles.statRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Tasa de Completación
            </Text>
          </View>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: theme.card, borderColor: theme.primary }
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats.completionRate}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
          <Text style={[styles.value, { color: theme.primary }]}>
            {stats.completionRate}%
          </Text>
        </View>
      )}
    </View>
  );

  const renderAreaStats = () => (
    <View style={{ gap: 10 }}>
      {Object.entries(stats || {}).map(([area, data]) => (
        <View
          key={area}
          style={[
            styles.areaCard,
{ backgroundColor: isDark ? theme.glass : theme.glassStrong, borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle }
          ]}
        >
          <Text style={[styles.areaName, { color: theme.text }]}>
            {area}
          </Text>
          <View style={[styles.areaMetrics, { borderTopColor: theme.bgSecondary }]}>
            <MetricBadge label="Completadas" value={data.completed} color={theme.success} />
            <MetricBadge label="Total" value={data.total} color={theme.info} />
            <MetricBadge label="Tasa" value={`${data.completionRate}%`} color={theme.primary} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderPriorityStats = () => (
    <View style={{ gap: 12 }}>
      {stats && (
        <>
          <StatRow 
            label="Alta Prioridad" 
            value={stats.alta || 0}
            color={theme.error}
            icon="alert"
          />
          <StatRow 
            label="Prioridad Media" 
            value={stats.media || 0}
            color={theme.warning}
            icon="help"
          />
          <StatRow 
            label="Baja Prioridad" 
            value={stats.baja || 0}
            color={theme.success}
            icon="checkmark"
          />
        </>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: `rgba(0, 0, 0, ${fadeAnim})` },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#1C1118' : '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={theme.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.body, { paddingHorizontal: padding }]}>
              {type === 'general' && renderGeneralStats()}
              {type === 'areas' && renderAreaStats()}
              {type === 'priority' && renderPriorityStats()}
            </View>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const StatRow = ({ label, value, color, icon }) => {
  const { theme, isDark } = useTheme();
  return (
    <View style={styles.statRow}>
      <Ionicons name={icon} size={20} color={color} />
      <Text
        style={[
          styles.label,
          { color: theme.textSecondary, flex: 1, marginLeft: 12 },
        ]}
      >
        {label}
      </Text>
      <Text style={[styles.value, { color: theme.text }]}>
        {value}
      </Text>
    </View>
  );
};

const MetricBadge = ({ label, value, color }) => {
  const { theme, isDark } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[styles.badgeValue, { color }]}>
        {value}
      </Text>
      <Text style={[styles.badgeLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.30,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  body: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  areaCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  areaName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  areaMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});
