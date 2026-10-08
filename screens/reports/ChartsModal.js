// screens/reports/ChartsModal.js
// Gráficas detalladas del reporte: avance de subtareas, completadas por día y
// distribución por prioridad.
import React, { Suspense, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShimmerEffect from '../../components/ShimmerEffect';

const LineChart = React.lazy(() => import('react-native-chart-kit').then((module) => ({ default: module.LineChart })));
const PieChart = React.lazy(() => import('react-native-chart-kit').then((module) => ({ default: module.PieChart })));

const CHART_HEIGHT = 180;
const lineColor = (opacity = 1) => `rgba(159, 34, 65, ${opacity})`;

/** Datos de la gráfica de prioridades (solo las que tienen tareas) */
export const priorityChartData = (distribution, theme) => [
  { name: 'Alta', population: distribution.alta || 0, color: theme.errorDark, legendFontColor: theme.text },
  { name: 'Media', population: distribution.media || 0, color: theme.warning, legendFontColor: theme.text },
  { name: 'Baja', population: distribution.baja || 0, color: theme.success, legendFontColor: theme.text },
].filter((item) => item.population > 0);

function Section({ icon, title, theme, children }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ionicons name={icon} size={18} color={theme.primary} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function ChartsModal({
  visible, onClose, subtasksStats, tasksWithProgress, dailyCompletions, priorityData, chartWidth, theme,
}) {
  const lineData = useMemo(() => ({
    labels: dailyCompletions.map((day) => day.date),
    datasets: [{ data: dailyCompletions.map((day) => day.count), strokeWidth: 2, color: lineColor }],
  }), [dailyCompletions]);

  const withSubtasks = tasksWithProgress.filter((task) => task.subtasksTotal > 0);
  const chartFallback = <ShimmerEffect width="100%" height={CHART_HEIGHT} borderRadius={8} />;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Gráficas detalladas</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="close-circle" size={26} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {(subtasksStats.completed > 0 || subtasksStats.pending > 0) && (
              <Section icon="checkmark-done" title="Progreso de subtareas" theme={theme}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { label: 'Completadas', value: subtasksStats.completed, color: theme.success },
                    { label: 'Pendientes', value: subtasksStats.pending, color: theme.warning },
                    { label: 'Completado', value: `${subtasksStats.completionRate}%`, color: theme.primary },
                  ].map((stat) => (
                    <View key={stat.label} style={{ flex: 1, backgroundColor: theme.glass, borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.glassBorder }}>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: stat.color }}>{stat.value}</Text>
                      <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </Section>
            )}

            {withSubtasks.length > 0 && (
              <Section icon="list" title="Tareas con más avance (top 10)" theme={theme}>
                {withSubtasks.map((task, index) => (
                  <View key={task.id} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, color: theme.text, flex: 1 }} numberOfLines={1}>{index + 1}. {task.title}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary }}>{task.progress}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${task.progress}%`, height: '100%', backgroundColor: task.progress === 100 ? theme.success : task.progress >= 50 ? theme.info : theme.warning, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>{task.subtasksCompleted}/{task.subtasksTotal} subtareas</Text>
                  </View>
                ))}
              </Section>
            )}

            {dailyCompletions.length > 0 && (
              <Section icon="trending-up" title="Completadas por día" theme={theme}>
                <Suspense fallback={chartFallback}>
                  <LineChart
                    data={lineData}
                    width={chartWidth}
                    height={CHART_HEIGHT}
                    chartConfig={{
                      backgroundColor: theme.card,
                      backgroundGradientFrom: theme.card,
                      backgroundGradientTo: theme.card,
                      color: lineColor,
                      strokeWidth: 2,
                      style: { borderRadius: 16 },
                      labelColor: () => theme.textSecondary,
                    }}
                    style={{ borderRadius: 16 }}
                  />
                </Suspense>
              </Section>
            )}

            {priorityData.length > 0 && (
              <Section icon="flag" title="Distribución por prioridad" theme={theme}>
                <Suspense fallback={chartFallback}>
                  <PieChart
                    data={priorityData}
                    width={chartWidth}
                    height={CHART_HEIGHT}
                    chartConfig={{ color: (opacity = 1) => `rgba(255,255,255,${opacity})` }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="10"
                  />
                </Suspense>
              </Section>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
