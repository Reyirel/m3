// components/AreaStatsCard.js
// Tarjeta compacta con modal de detalle al tocar
// Sin animaciones useNativeDriver:false para evitar bloqueo del cursor en web

import React, { useRef, useEffect, useState, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

// ── helpers de estado ──────────────────────────────────────────────────────
function getStatus(rate) {
  if (rate >= 85) return { color: '#059669', bg: '#ECFDF5', label: 'Excelente',    icon: 'checkmark-circle' };
  if (rate >= 60) return { color: '#2563EB', bg: '#EFF6FF', label: 'En Progreso',  icon: 'arrow-forward-circle' };
  if (rate >= 30) return { color: '#D97706', bg: '#FFFBEB', label: 'Atrasado',     icon: 'time' };
  return           { color: '#DC2626', bg: '#FEF2F2', label: 'Crítico',       icon: 'alert-circle' };
}

// ── componente principal ───────────────────────────────────────────────────
const AreaStatsCard = memo(function AreaStatsCard({
  areaName,
  completed,
  total,
  assignedUsers = 0,
  avgCompletionTime = 0,
  overdueTasks = 0,
  onPress,
  index = 0,
  trend = 'stable',
  trendValue = 0,
}) {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Solo animación de entrada — useNativeDriver:true para no bloquear JS thread
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(10)).current;

  const rate    = total > 0 ? (completed / total) * 100 : 0;
  const status  = getStatus(rate);
  const isSecretaria = areaName?.toLowerCase().includes('secretar');
  const areaIcon = isSecretaria ? 'briefcase-outline' : 'folder-outline';

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 60),
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim,   { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handlePress = () => {
    if (onPress) onPress(areaName);
    setModalVisible(true);
  };

  const trendColor = trend === 'up' ? '#059669' : trend === 'down' ? '#DC2626' : '#9CA3AF';
  const trendIcon  = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <>
      {/* ── TARJETA COMPACTA ── */}
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
            borderLeftColor: status.color,
            opacity: opacityAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity onPress={handlePress} activeOpacity={0.72} style={styles.row}>
          {/* Icono tipo área */}
          <View style={[styles.iconWrap, { backgroundColor: isDark ? `${status.color}22` : status.bg }]}>
            <Ionicons name={areaIcon} size={14} color={status.color} />
          </View>

          {/* Nombre + barra de progreso */}
          <View style={styles.middle}>
            <Text style={[styles.areaName, { color: theme.text }]} numberOfLines={1}>
              {areaName}
            </Text>
            {/* Barra estática — sin Animated para no bloquear JS thread en web */}
            <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
              <View style={[styles.fill, { width: `${Math.round(rate)}%`, backgroundColor: status.color }]} />
            </View>
          </View>

          {/* Badge estado + % + flecha */}
          <View style={styles.right}>
            <View style={[styles.badge, { backgroundColor: isDark ? `${status.color}22` : status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={[styles.pct, { color: status.color }]}>{Math.round(rate)}%</Text>
            <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── MODAL DE DETALLE ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.sheet, { backgroundColor: theme.card }]}>

                {/* Cabecera modal */}
                <View style={[styles.sheetHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                  <View style={[styles.sheetIconWrap, { backgroundColor: isDark ? `${status.color}22` : status.bg }]}>
                    <Ionicons name={areaIcon} size={18} color={status.color} />
                  </View>
                  <View style={styles.sheetTitleBlock}>
                    <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={2}>{areaName}</Text>
                    <View style={[styles.badge, { backgroundColor: isDark ? `${status.color}22` : status.bg, alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Ionicons name={status.icon} size={11} color={status.color} style={{ marginRight: 3 }} />
                      <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Barra de progreso modal */}
                <View style={styles.sheetProgressWrap}>
                  <View style={[styles.sheetTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                    <View style={[styles.sheetFill, { width: `${Math.round(rate)}%`, backgroundColor: status.color }]} />
                  </View>
                  <Text style={[styles.sheetPct, { color: status.color }]}>{Math.round(rate)}%</Text>
                </View>

                {/* Métricas 3 columnas */}
                <View style={[styles.metricsRow, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                  <View style={styles.metricCol}>
                    <Text style={[styles.metricVal, { color: theme.text }]}>{completed}</Text>
                    <Text style={[styles.metricLbl, { color: theme.textSecondary }]}>COMPLETADAS</Text>
                  </View>
                  <View style={[styles.metricDiv, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]} />
                  <View style={styles.metricCol}>
                    <Text style={[styles.metricVal, { color: theme.text }]}>{total}</Text>
                    <Text style={[styles.metricLbl, { color: theme.textSecondary }]}>TOTAL</Text>
                  </View>
                  <View style={[styles.metricDiv, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]} />
                  <View style={styles.metricCol}>
                    <Text style={[styles.metricVal, { color: theme.text }]}>{total - completed}</Text>
                    <Text style={[styles.metricLbl, { color: theme.textSecondary }]}>PENDIENTES</Text>
                  </View>
                </View>

                {/* Tags secundarios */}
                <View style={styles.tagsRow}>
                  {assignedUsers > 0 && (
                    <View style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB' }]}>
                      <Ionicons name="people-outline" size={13} color={theme.textSecondary} />
                      <Text style={[styles.tagChipText, { color: theme.textSecondary }]}>
                        {assignedUsers} {assignedUsers === 1 ? 'usuario' : 'usuarios'}
                      </Text>
                    </View>
                  )}
                  {overdueTasks > 0 && (
                    <View style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(220,38,38,0.15)' : '#FEF2F2' }]}>
                      <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                      <Text style={[styles.tagChipText, { color: '#DC2626' }]}>
                        {overdueTasks} vencida{overdueTasks > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {avgCompletionTime > 0 && (
                    <View style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB' }]}>
                      <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                      <Text style={[styles.tagChipText, { color: theme.textSecondary }]}>
                        Promedio {avgCompletionTime}d
                      </Text>
                    </View>
                  )}
                  {trendValue !== 0 && (
                    <View style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB' }]}>
                      <Ionicons name={trendIcon} size={13} color={trendColor} />
                      <Text style={[styles.tagChipText, { color: trendColor }]}>
                        {trendValue > 0 ? '+' : ''}{trendValue}% vs anterior
                      </Text>
                    </View>
                  )}
                </View>

                {/* Botón cerrar */}
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={[styles.dismissBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dismissText, { color: theme.textSecondary }]}>Cerrar</Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});

AreaStatsCard.displayName = 'AreaStatsCard';
export default AreaStatsCard;

const styles = StyleSheet.create({
  // ── tarjeta compacta ──────────────────────────────────────────────
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  middle: {
    flex: 1,
    gap: 5,
  },
  areaName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  pct: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },

  // ── modal ─────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  sheetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  sheetTitleBlock: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  closeBtn: {
    padding: 4,
    marginTop: 2,
  },
  sheetProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sheetFill: {
    height: '100%',
    borderRadius: 4,
  },
  sheetPct: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 46,
    textAlign: 'right',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 3,
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricDiv: {
    width: 1,
    height: 32,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dismissBtn: {
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
