// screens/reports/AlertsPanel.js
// Alertas de las áreas y sugerencias, en la pestaña Indicadores de Reportes.
// Muestra las más graves primero y solo unas pocas: el resto se despliega con "Ver más",
// para que las alertas no empujen los indicadores fuera de la pantalla.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../theme/tokens';
import { ACTIVE_OPACITY } from '../../theme/motion';

// Alertas visibles sin desplegar
const VISIBLE_ALERTS = 3;

const SEVERITY_ICON = {
  critical: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

const SUGGESTION_ICON = { critical: 'alert-circle', high: 'warning' };

export default function AlertsPanel({ alerts = [], suggestions = [], onAlertPress, onDismiss }) {
  const { theme } = useTheme();
  const [dismissed, setDismissed] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const visible = useMemo(() => alerts.filter((alert) => !dismissed.has(alert.id)), [alerts, dismissed]);

  if (visible.length === 0 && suggestions.length === 0) return null;

  const severityColor = (severity) => {
    if (severity === 'critical') return theme.error;
    if (severity === 'warning') return theme.warningText;
    return theme.info;
  };
  const severityBackground = (severity) => {
    if (severity === 'critical') return theme.errorAlpha;
    if (severity === 'warning') return theme.warningAlpha;
    return theme.infoAlpha;
  };

  const dismiss = (alert) => {
    setDismissed((current) => new Set([...current, alert.id]));
    onDismiss?.(alert.id);
  };

  const shown = showAll ? visible : visible.slice(0, VISIBLE_ALERTS);
  const hiddenCount = visible.length - shown.length;
  const criticalCount = visible.filter((alert) => alert.severity === 'critical').length;

  return (
    <View style={styles.container}>
      {visible.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.heading, { color: theme.text }]} accessibilityRole="header">
              Áreas que requieren atención
            </Text>
            <Text style={[styles.count, { color: theme.textSecondary }]}>
              {criticalCount > 0 ? `${criticalCount} ${criticalCount === 1 ? 'crítica' : 'críticas'} · ` : ''}
              {visible.length} en total
            </Text>
          </View>

          {shown.map((alert, index) => {
            const color = severityColor(alert.severity);
            return (
              <View
                key={alert.id}
                style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.borderLight }]}
              >
                <TouchableOpacity
                  style={styles.rowMain}
                  onPress={onAlertPress ? () => onAlertPress(alert) : undefined}
                  disabled={!onAlertPress}
                  activeOpacity={ACTIVE_OPACITY}
                  accessibilityRole={onAlertPress ? 'button' : 'text'}
                  accessibilityLabel={`${alert.title}. ${alert.description}`}
                  accessibilityHint={onAlertPress ? 'Toca para ver solo esta área' : undefined}
                >
                  <View style={[styles.iconWrap, { backgroundColor: severityBackground(alert.severity) }]}>
                    <Ionicons name={SEVERITY_ICON[alert.severity] || SEVERITY_ICON.info} size={18} color={color} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{alert.title}</Text>
                    <Text style={[styles.description, { color: theme.textSecondary }]}>{alert.description}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => dismiss(alert)}
                  style={styles.dismiss}
                  activeOpacity={ACTIVE_OPACITY}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Descartar alerta de ${alert.title}`}
                >
                  <Ionicons name="close" size={18} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            );
          })}

          {(hiddenCount > 0 || showAll) && visible.length > VISIBLE_ALERTS && (
            <TouchableOpacity
              style={[styles.more, { borderTopColor: theme.borderLight }]}
              onPress={() => setShowAll((value) => !value)}
              activeOpacity={ACTIVE_OPACITY}
              accessibilityRole="button"
            >
              <Text style={[styles.moreText, { color: theme.primary }]}>
                {showAll ? 'Ver menos' : `Ver ${hiddenCount} más`}
              </Text>
              <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
          <TouchableOpacity
            style={styles.suggestionsHeader}
            onPress={() => setSuggestionsOpen((value) => !value)}
            activeOpacity={ACTIVE_OPACITY}
            accessibilityRole="button"
            accessibilityState={{ expanded: suggestionsOpen }}
          >
            <Ionicons name="bulb-outline" size={18} color={theme.warningText} />
            <Text style={[styles.heading, styles.suggestionsTitle, { color: theme.text }]}>
              Sugerencias ({suggestions.length})
            </Text>
            <Ionicons name={suggestionsOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
          </TouchableOpacity>

          {suggestionsOpen && suggestions.map((suggestion, index) => (
            <View
              key={index}
              style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.borderLight }]}
            >
              <View style={styles.rowMain}>
                <View style={[styles.iconWrap, { backgroundColor: theme.background }]}>
                  <Ionicons
                    name={SUGGESTION_ICON[suggestion.priority] || 'information-circle'}
                    size={18}
                    color={suggestion.priority === 'critical' ? theme.error : suggestion.priority === 'high' ? theme.warningText : theme.info}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.title, { color: theme.text }]}>{suggestion.title}</Text>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>{suggestion.action}</Text>
                  {Array.isArray(suggestion.areas) && suggestion.areas.length > 0 && (
                    <Text style={[styles.areas, { color: theme.textTertiary }]} numberOfLines={2}>
                      {suggestion.areas.join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  card: {
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  heading: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
  },
  count: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  description: {
    ...TYPOGRAPHY.caption,
    marginTop: 2,
  },
  areas: {
    ...TYPOGRAPHY.caption,
    marginTop: 4,
  },
  dismiss: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  moreText: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
  },
  suggestionsTitle: {
    flex: 1,
  },
});
