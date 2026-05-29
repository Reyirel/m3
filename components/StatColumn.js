// components/StatColumn.js
// Columna de estado estilo Kanban para mostrar métricas
// ✨ Componente para layout estilo Kanban mejorado

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function StatColumn({
  icon = 'checkmark-circle',
  title = 'Estado',
  count = 0,
  headerColor = null,
  items = [], // Array de items para mostrar
  _backgroundColor = null,
}) {
  const { theme, isDark } = useTheme();
  const resolvedHeaderColor = resolvedHeaderColor ?? theme.success;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
      {/* Header de columna */}
      <View
        style={[
          styles.header,
          { backgroundColor: resolvedHeaderColor },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconBadge}>
            <Ionicons name={icon} size={20} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.count}>{count}</Text>
          </View>
        </View>
      </View>

      {/* Items/cards */}
      <ScrollView
        style={styles.itemsContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.item,
                {
                  borderLeftColor: resolvedHeaderColor,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                  borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
                }
              ]}
            >
              {item.label && (
                <Text style={[styles.itemLabel, { color: theme.text }]}>
                  {item.label}
                </Text>
              )}
              {item.value && (
                <Text style={[styles.itemValue, { color: resolvedHeaderColor }]}>
                  {item.value}
                </Text>
              )}
              {item.subtitle && (
                <Text style={[styles.itemSubtitle, { color: theme.textSecondary }]}>
                  {item.subtitle}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="folder-open-outline"
              size={32}
              color={resolvedHeaderColor}
              style={{ opacity: 0.3, marginBottom: 8 }}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Sin datos
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Footer con resumen */}
      {items && items.length > 0 && (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  count: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  itemsContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  item: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 12,
    fontWeight: '400',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
