// screens/reports/HierarchySummary.js
// Comparativa de rendimiento entre secretarías y direcciones. Tocar una tarjeta
// filtra el resto del reporte por las áreas de ese tipo.
import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

function HierarchyCard({ title, icon, colors, metrics, scaleStyle, pulseStyle, onPress, styles, isDark }) {
  const boxes = [
    { label: 'Total', value: metrics.total },
    { label: 'Completadas', value: metrics.completed, color: '#A7F3D0' },
    { label: 'Pendientes', value: metrics.pending, color: '#FDE68A' },
    ...(metrics.overdue > 0 ? [{ label: 'Vencidas', value: metrics.overdue, color: '#FCA5A5' }] : []),
  ];

  return (
    <Animated.View style={[styles.hierarchyCardWrapper, scaleStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.hierarchyCardTouchable}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hierarchyCardGradient}>
          <View style={[styles.hierarchyGlassOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)' }]} />

          <View style={styles.hierarchyCardHeader}>
            <View style={styles.hierarchyCardIconContainer}>
              <View style={styles.hierarchyCardIconBg}>
                <Ionicons name={icon} size={28} color="#FFF" />
              </View>
            </View>
            <View style={styles.hierarchyCardTitleArea}>
              <Text style={styles.hierarchyCardTitle}>{title}</Text>
              <Text style={styles.hierarchyCardCount}>{metrics.areas.length} áreas activas</Text>
            </View>
            <Animated.View style={[styles.hierarchyRateBadge, pulseStyle]}>
              <Text style={styles.hierarchyRateBadgeText}>{metrics.avgRate}%</Text>
            </Animated.View>
          </View>

          <View style={styles.hierarchyProgressWrapper}>
            <View style={styles.hierarchyProgressTrack}>
              <View style={[styles.hierarchyProgressFill, { width: `${metrics.avgRate}%`, backgroundColor: 'rgba(255,255,255,0.9)' }]} />
            </View>
          </View>

          <View style={styles.hierarchyMetricsGrid}>
            {boxes.map((box, index) => (
              <React.Fragment key={box.label}>
                {index > 0 && <View style={styles.hierarchyMetricDivider} />}
                <View style={styles.hierarchyMetricBox}>
                  <Text style={[styles.hierarchyMetricValue, box.color && { color: box.color }]}>{box.value}</Text>
                  <Text style={styles.hierarchyMetricLabel}>{box.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          <View style={styles.hierarchyCardFooter}>
            <Text style={styles.hierarchyTapHint}>Toca para filtrar</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HierarchySummary({ metricsByType, filteredAreas, onFilterAreas, anim, styles, theme, isDark }) {
  const { secretaria, direccion } = metricsByType;
  if (!(secretaria.total > 0 || direccion.total > 0)) return null;

  const glassCard = {
    backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
  };

  return (
    <Animated.View style={anim.hierarchy}>
      <View style={[styles.hierarchySectionWrapper, glassCard]}>
        <View style={styles.hierarchySectionHeader}>
          <LinearGradient
            colors={theme.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hierarchySectionIcon}
          >
            <Ionicons name="git-network" size={24} color="#FFF" />
          </LinearGradient>
          <View style={styles.hierarchySectionTitleContainer}>
            <Text style={[styles.hierarchySectionTitle, { color: theme.text }]}>Rendimiento por Jerarquía</Text>
            <Text style={[styles.hierarchySectionSubtitle, { color: theme.textSecondary }]}>
              Comparativa Secretarías vs Direcciones
            </Text>
          </View>
        </View>

        <View style={styles.hierarchyCardsRow}>
          <HierarchyCard
            title="Secretarías"
            icon="briefcase"
            colors={theme.gradientHeader}
            metrics={secretaria}
            scaleStyle={anim.secretariaScale}
            pulseStyle={anim.pulse}
            onPress={() => onFilterAreas(secretaria.areas.map((area) => area.name))}
            styles={styles}
            isDark={isDark}
          />
          <HierarchyCard
            title="Direcciones"
            icon="folder-open"
            colors={[theme.info, isDark ? theme.info + 'CC' : theme.info]}
            metrics={direccion}
            scaleStyle={anim.direccionScale}
            pulseStyle={anim.pulse}
            onPress={() => onFilterAreas(direccion.areas.map((area) => area.name))}
            styles={styles}
            isDark={isDark}
          />
        </View>

        {filteredAreas.length > 0 && (
          <TouchableOpacity
            style={[styles.clearFilterButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
            onPress={() => onFilterAreas([])}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color={theme.primary} />
            <Text style={[styles.clearFilterButtonText, { color: theme.primary }]}>
              Limpiar filtro ({filteredAreas.length} áreas seleccionadas)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}
