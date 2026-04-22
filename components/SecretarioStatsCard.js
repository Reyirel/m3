// components/SecretarioStatsCard.js
// Resumen compacto de secretarios con modal de detalle al tocar
// Cada fila muestra: avatar + nombre + barra de progreso + % + chevron

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getSecretarioMetrics, formatCompletionTime } from '../services/analytics';
import { SPACING, TYPOGRAPHY, RADIUS } from '../theme/tokens';

function getStatusColor(rate, theme) {
  if (rate >= 80) return theme.success;
  if (rate >= 60) return theme.warning;
  return theme.error;
}

function getStatusLabel(rate) {
  if (rate >= 80) return 'Excelente';
  if (rate >= 60) return 'Regular';
  return 'Bajo';
}

// ── Modal de detalle para un secretario ────────────────────────────────────
function SecretarioModal({ secretario, visible, onClose, theme, isDark }) {
  if (!secretario) return null;

  const color = getStatusColor(secretario.completionRate, theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: theme.card }]}>

              {/* Cabecera */}
              <View style={[styles.sheetHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                <View style={[styles.avatarLg, { backgroundColor: `${color}22` }]}>
                  <Text style={[styles.avatarLgText, { color }]}>
                    {secretario.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.sheetTitleBlock}>
                  <Text style={[styles.sheetTitle, { color: theme.text }]} numberOfLines={1}>
                    {secretario.displayName}
                  </Text>
                  <Text style={[styles.sheetEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                    {secretario.email}
                  </Text>
                  {secretario.area ? (
                    <Text style={[styles.sheetArea, { color }]} numberOfLines={1}>
                      {secretario.area}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Barras de progreso */}
              <View style={styles.sheetRates}>
                {[
                  { label: 'Completitud', value: secretario.completionRate },
                  { label: 'A tiempo',    value: secretario.onTimeRate },
                ].map(({ label, value }) => {
                  const c = getStatusColor(value, theme);
                  return (
                    <View key={label} style={styles.rateRow}>
                      <Text style={[styles.rateLabel, { color: theme.textSecondary }]}>{label}</Text>
                      <View style={[styles.rateTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                        <View style={[styles.rateFill, { width: `${value}%`, backgroundColor: c }]} />
                      </View>
                      <Text style={[styles.rateValue, { color: c }]}>{value}%</Text>
                    </View>
                  );
                })}
              </View>

              {/* Métricas 4 columnas */}
              <View style={[styles.metricsRow, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                {[
                  { val: secretario.totalCreated,   lbl: 'DELEGADAS',   color: theme.text },
                  { val: secretario.totalCompleted, lbl: 'HECHAS',      color: theme.success },
                  { val: secretario.totalPending,   lbl: 'PENDIENTES',  color: theme.warning },
                  { val: secretario.totalOverdue,   lbl: 'VENCIDAS',    color: secretario.totalOverdue > 0 ? theme.error : theme.text },
                ].map(({ val, lbl, color: c }, i, arr) => (
                  <React.Fragment key={lbl}>
                    <View style={styles.metricCol}>
                      <Text style={[styles.metricVal, { color: c }]}>{val}</Text>
                      <Text style={[styles.metricLbl, { color: theme.textSecondary }]}>{lbl}</Text>
                    </View>
                    {i < arr.length - 1 && (
                      <View style={[styles.metricDiv, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB' }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Tags */}
              <View style={styles.tagsRow}>
                {secretario.avgCompletionTime > 0 && (
                  <View style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB' }]}>
                    <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                      Promedio {formatCompletionTime(secretario.avgCompletionTime)}
                    </Text>
                  </View>
                )}
                <View style={[styles.tagChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB' }]}>
                  <Ionicons name="calendar-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                    Esta semana: +{secretario.createdThisWeek} · {secretario.completedThisWeek} hechas
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
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
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function SecretarioStatsCard({ onSecretarioPress }) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [secretarioData, setSecretarioData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedSecretario, setSelectedSecretario] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadSecretarioStats();
  }, []);

  const loadSecretarioStats = async () => {
    setLoading(true);
    try {
      const result = await getSecretarioMetrics();
      if (result.success) setSecretarioData(result);
    } catch (error) {
      if (__DEV__) console.error('Error loading secretario stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowPress = (secretario) => {
    setSelectedSecretario(secretario);
    setModalVisible(true);
    if (onSecretarioPress) onSecretarioPress(secretario);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Cargando estadísticas de secretarios...
        </Text>
      </View>
    );
  }

  if (!secretarioData || secretarioData.secretarios.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
        <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No hay secretarios registrados
        </Text>
      </View>
    );
  }

  const { secretarios, totals } = secretarioData;

  return (
    <>
      <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>

        {/* Header con toggle */}
        <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
          <View style={styles.headerLeft}>
            <Ionicons name="briefcase" size={20} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>
              Rendimiento de Secretarios
            </Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {/* Resumen 4 columnas */}
        <View style={[styles.summaryStrip, { borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
          {[
            { val: totals.totalSecretarios,   lbl: 'Secretarios', color: theme.primary },
            { val: totals.totalTasksCreated,   lbl: 'Delegadas',   color: theme.text    },
            { val: totals.totalTasksCompleted, lbl: 'Hechas',      color: theme.success },
            { val: totals.totalTasksOverdue,   lbl: 'Vencidas',    color: totals.totalTasksOverdue > 0 ? theme.error : theme.text },
          ].map(({ val, lbl, color }, i, arr) => (
            <React.Fragment key={lbl}>
              <View style={styles.summaryCol}>
                <Text style={[styles.summaryVal, { color }]}>{val}</Text>
                <Text style={[styles.summaryLbl, { color: theme.textSecondary }]}>{lbl}</Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[styles.summaryDiv, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Tasas promedio */}
        <View style={[styles.ratesStrip, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: RADIUS.md }]}>
          {[
            { icon: 'trending-up', label: 'Completitud',    value: totals.avgCompletionRate },
            { icon: 'time',        label: 'A Tiempo',        value: totals.avgOnTimeRate     },
          ].map(({ icon, label, value }, i) => {
            const c = getStatusColor(parseFloat(value), theme);
            return (
              <React.Fragment key={label}>
                {i > 0 && <View style={[styles.summaryDiv, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', marginVertical: 8 }]} />}
                <View style={styles.rateItem}>
                  <Ionicons name={icon} size={16} color={c} />
                  <Text style={[styles.rateItemVal, { color: c }]}>{value}%</Text>
                  <Text style={[styles.rateItemLbl, { color: theme.textSecondary }]}>{label}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* Lista compacta de secretarios */}
        {expanded && (
          <View style={styles.list}>
            {secretarios.map((sec) => {
              const color = getStatusColor(sec.completionRate, theme);
              return (
                <TouchableOpacity
                  key={sec.id}
                  style={[styles.row, { borderLeftColor: color }]}
                  activeOpacity={0.72}
                  onPress={() => handleRowPress(sec)}
                >
                  {/* Avatar inicial */}
                  <View style={[styles.avatarSm, { backgroundColor: `${color}22` }]}>
                    <Text style={[styles.avatarSmText, { color }]}>
                      {sec.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Nombre + barra */}
                  <View style={styles.rowMiddle}>
                    <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
                      {sec.displayName}
                    </Text>
                    <View style={[styles.rowTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}>
                      <View style={[styles.rowFill, { width: `${sec.completionRate}%`, backgroundColor: color }]} />
                    </View>
                  </View>

                  {/* % + label + chevron */}
                  <View style={styles.rowRight}>
                    <View style={[styles.badge, { backgroundColor: isDark ? `${color}22` : `${color}18` }]}>
                      <Text style={[styles.badgeText, { color }]}>{getStatusLabel(sec.completionRate)}</Text>
                    </View>
                    <Text style={[styles.rowPct, { color }]}>{sec.completionRate}%</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {!expanded && secretarios.length > 0 && (
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Toca para ver {secretarios.length} secretario{secretarios.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <SecretarioModal
        secretario={selectedSecretario}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        theme={theme}
        isDark={isDark}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // ── contenedor principal ──────────────────────────────────────────
  container: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  // ── header ───────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
  },

  // ── resumen strip ────────────────────────────────────────────────
  summaryStrip: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLbl: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  summaryDiv: {
    width: 1,
    marginVertical: 8,
  },

  // ── tasas strip ──────────────────────────────────────────────────
  ratesStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: SPACING.md,
  },
  rateItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  rateItemVal: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: '700',
  },
  rateItemLbl: {
    fontSize: 10,
    fontWeight: '500',
  },

  // ── lista compacta ───────────────────────────────────────────────
  list: {
    gap: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  avatarSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarSmText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowMiddle: {
    flex: 1,
    gap: 5,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  rowFill: {
    height: '100%',
    borderRadius: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  badge: {
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
  rowPct: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 34,
    textAlign: 'right',
  },
  hint: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },

  // ── modal ────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatarLg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  avatarLgText: {
    fontSize: 20,
    fontWeight: '800',
  },
  sheetTitleBlock: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sheetEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetArea: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    marginTop: 2,
  },
  sheetRates: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rateLabel: {
    fontSize: 12,
    fontWeight: '500',
    width: 80,
  },
  rateTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rateFill: {
    height: '100%',
    borderRadius: 3,
  },
  rateValue: {
    fontSize: 13,
    fontWeight: '700',
    width: 42,
    textAlign: 'right',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 14,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  metricLbl: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  metricDiv: {
    width: 1,
    height: 28,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
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
