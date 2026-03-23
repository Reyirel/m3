// components/AlertsPanel.js
// Panel de alertas y sugerencias de optimización
// Ligero y sin dependencias pesadas

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import SpringCard from './SpringCard';

export default function AlertsPanel({
  alerts = [],
  suggestions = [],
  onAlertPress = () => {},
  onDismiss = () => {}
}) {
  const { theme, isDark } = useTheme();
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);

  if (alerts.length === 0 && suggestions.length === 0) {
    return null;
  }

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.has(a.id));

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#10B981';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return 'alert-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  return (
    <View style={styles.container}>
      {/* Alertas críticas primero */}
      {visibleAlerts.filter(a => a.severity === 'critical').map(alert => (
        <TouchableOpacity
          key={alert.id}
          onPress={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
          activeOpacity={0.7}
        >
          <SpringCard
            style={[
              styles.alertCard,
              {
                backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
                borderLeftColor: getSeverityColor(alert.severity),
                borderWidth: 1,
                borderLeftWidth: 4
              }
            ]}
          >
            <View style={styles.alertHeader}>
              <View style={styles.alertTitleRow}>
                <Ionicons
                  name={getSeverityIcon(alert.severity)}
                  size={20}
                  color={'#DC2626'}
                  style={styles.alertIcon}
                />
                <Text style={[styles.alertTitle, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>
                  {alert.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setDismissedAlerts(new Set([...dismissedAlerts, alert.id]));
                  onDismiss(alert.id);
                }}
              >
                <Ionicons name="close" size={20} color={isDark ? '#FCA5A5' : '#DC2626'} />
              </TouchableOpacity>
            </View>

            {expandedAlert === alert.id && (
              <View style={styles.alertDetails}>
                <Text style={[styles.alertDescription, { color: theme.textSecondary }]}>
                  {alert.description}
                </Text>
                {alert.stats && (
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total</Text>
                      <Text style={[styles.statValue, { color: theme.text }]}>
                        {alert.stats.total}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Problema</Text>
                      <Text style={[styles.statValue, { color: '#DC2626' }]}>
                        {alert.stats.overdue || alert.stats.pending || 0}
                      </Text>
                    </View>
                  </View>
                )}
                {alert.action && (
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#DC2626' }]}
                    onPress={() => onAlertPress(alert)}
                  >
                    <Text style={styles.actionText}>{alert.action}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </SpringCard>
        </TouchableOpacity>
      ))}

      {/* Alertas de advertencia */}
      {visibleAlerts.filter(a => a.severity === 'warning').slice(0, 2).map(alert => (
        <TouchableOpacity
          key={alert.id}
          onPress={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
          activeOpacity={0.7}
        >
          <SpringCard
            style={[
              styles.alertCard,
              {
                backgroundColor: isDark ? '#78350F' : '#FEF3C7',
                borderLeftColor: getSeverityColor(alert.severity),
                borderLeftWidth: 4
              }
            ]}
          >
            <View style={styles.alertHeader}>
              <View style={styles.alertTitleRow}>
                <Ionicons
                  name="warning"
                  size={18}
                  color={'#F59E0B'}
                  style={styles.alertIcon}
                />
                <Text style={[styles.alertTitle, { color: isDark ? '#FBBF24' : '#B45309' }]} numberOfLines={2}>
                  {alert.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDismissedAlerts(new Set([...dismissedAlerts, alert.id]))}
              >
                <Ionicons name="close" size={18} color={isDark ? '#FBBF24' : '#B45309'} />
              </TouchableOpacity>
            </View>
          </SpringCard>
        </TouchableOpacity>
      ))}

      {/* Sugerencias de optimización — colapsables */}
      {suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={styles.suggestionsTrigger}
            onPress={() => setSuggestionsExpanded(v => !v)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
              <Text style={[styles.suggestionsTitle, { color: theme.text }]}>
                Sugerencias de optimización
              </Text>
              <View style={[styles.suggestionsBadge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={{ color: '#F59E0B', fontSize: 11, fontWeight: '700' }}>{suggestions.length}</Text>
              </View>
            </View>
            <Ionicons
              name={suggestionsExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          {suggestionsExpanded && suggestions.map((suggestion, index) => (
            <View key={index} style={[styles.suggestionItem, { backgroundColor: theme.card }]}>
              <Ionicons
                name={
                  suggestion.priority === 'critical' ? 'alert' :
                  suggestion.priority === 'high' ? 'warning' : 'information-circle'
                }
                size={18}
                color={
                  suggestion.priority === 'critical' ? '#DC2626' :
                  suggestion.priority === 'high' ? '#F59E0B' : '#3B82F6'
                }
              />
              <View style={styles.suggestionContent}>
                <Text style={[styles.suggestionPriority, { color: theme.text }]}>
                  {suggestion.title}
                </Text>
                <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
                  {suggestion.action}
                </Text>
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
    gap: 12,
    marginBottom: 20
  },
  alertCard: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8
  },
  alertIcon: {
    marginTop: 2,
    flexShrink: 0
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  alertDetails: {
    marginTop: 12,
    gap: 10
  },
  alertDescription: {
    fontSize: 13,
    lineHeight: 18
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700'
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4
  },
  suggestionsTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  suggestionsTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionsBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'flex-start'
  },
  suggestionContent: {
    flex: 1,
    gap: 2
  },
  suggestionPriority: {
    fontSize: 13,
    fontWeight: '600'
  },
  suggestionText: {
    fontSize: 12,
    lineHeight: 16
  }
});
