// screens/kanban/KanbanColumn.js
// Una columna del tablero (un estado) y las tarjetas de sus tareas.
import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FadeInView from '../../components/FadeInView';
import PulsingDot from '../../components/PulsingDot';
import TaskStatusButtons from '../../components/TaskStatusButtons';
import { toMs } from '../../utils/dateUtils';
import { hapticLight, hapticMedium } from '../../utils/haptics';

const DAY_MS = 24 * 60 * 60 * 1000;
// Alto aproximado de una tarjeta, para que la lista calcule posiciones sin medir
const CARD_HEIGHT = 120;

const PRIORITY = {
  alta: { label: 'URGENTE', icon: 'flash' },
  media: { label: 'MEDIA', icon: 'warning' },
  baja: { label: 'BAJA', icon: 'checkmark-circle' },
};

const priorityColor = (priority, theme) => ({ alta: theme.error, media: theme.warning, baja: theme.success }[priority]);

const assigneeText = (assignedTo) => {
  const text = Array.isArray(assignedTo) ? assignedTo.join(', ') : assignedTo;
  return text || 'Sin asignar';
};

const keyExtractor = (item) => item.id;
const getItemLayout = (_data, index) => ({ length: CARD_HEIGHT, offset: CARD_HEIGHT * index, index });

const KanbanCard = React.memo(function KanbanCard({
  item, status, overdue, compact, onOpen, onQuickEdit, onStatusChange, styles, theme, isDark,
}) {
  const color = priorityColor(item.priority, theme);
  const priority = PRIORITY[item.priority] || PRIORITY.baja;
  const borderColor = item.priority === 'alta' || item.priority === 'media' ? color : theme.border;

  // Días que lleva la tarea en su estado actual
  const daysInStatus = item.statusChangedAt ? Math.floor((Date.now() - item.statusChangedAt) / DAY_MS) : 0;
  const statusAgeColor = daysInStatus > 10 ? theme.error : daysInStatus > 5 ? theme.warning : theme.textSecondary;

  return (
    <TouchableOpacity
      onPress={() => { hapticLight(); onOpen(item); }}
      onLongPress={() => { hapticMedium(); onQuickEdit(item); }}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? theme.card : theme.glassStrong,
            borderWidth: 1,
            borderColor: borderColor + '55',
            padding: 12,
            shadowColor: theme.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 2,
          },
          compact && { paddingVertical: 8, paddingHorizontal: 12 },
        ]}
      >
        {!compact && (
          <View style={styles.cardTopRow}>
            <View style={[styles.priorityChip, color && { backgroundColor: color }]}>
              <Ionicons name={priority.icon} size={10} color="#FFFFFF" />
              <Text style={styles.priorityChipText}>{priority.label}</Text>
              {item.priority === 'alta' && <PulsingDot size={4} color="#FFFFFF" />}
            </View>

            {overdue && (
              <View style={styles.overdueChip}>
                <Ionicons name="time" size={10} color="#FFFFFF" />
                <Text style={styles.overdueChipText}>VENCIDA</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {compact && (
            <>
              <View style={[styles.compactPriorityDot, { backgroundColor: color || theme.border }]} />
              {item.priority === 'alta' && <PulsingDot size={3} color={color} />}
            </>
          )}
          <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]} numberOfLines={compact ? 1 : 2}>
            {item.title}
          </Text>
          {compact && overdue && <Ionicons name="alert-circle" size={12} color={theme.error} />}
        </View>

        {!compact && (
          <>
            <View style={styles.cardInfoGrid}>
              <View style={styles.cardInfoItem}>
                <Ionicons name="person" size={11} color={status.color} />
                <Text style={[styles.cardInfoText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {assigneeText(item.assignedTo)}
                </Text>
              </View>

              <View style={styles.cardInfoItem}>
                <Ionicons name="calendar-outline" size={11} color={status.color} />
                <Text style={[styles.cardInfoText, { color: theme.textSecondary }]}>
                  {new Date(toMs(item.dueAt)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>

            {item.tags && item.tags.length > 0 && (
              <View style={styles.cardTagsContainer}>
                {item.tags.slice(0, 3).map((tag, index) => (
                  <View key={index} style={[styles.cardTag, { backgroundColor: theme.primaryAlpha }]}>
                    <Text style={[styles.cardTagText, { color: theme.primary }]}>#{tag}</Text>
                  </View>
                ))}
                {item.tags.length > 3 && (
                  <Text style={[styles.cardTagMore, { color: theme.textSecondary }]}>+{item.tags.length - 3}</Text>
                )}
              </View>
            )}

            {daysInStatus > 0 && (
              <View style={styles.statusAgeIndicator}>
                <Ionicons name="time-outline" size={10} color={statusAgeColor} />
                <Text style={[styles.statusAgeText, { color: statusAgeColor }]}>
                  {daysInStatus === 1 ? 'Hace 1 día' : `Hace ${daysInStatus} días`}
                </Text>
                {daysInStatus > 10 && <Ionicons name="warning" size={12} color={statusAgeColor} />}
              </View>
            )}

            <TaskStatusButtons currentStatus={item.status} taskId={item.id} onStatusChange={onStatusChange} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );
});

function EmptyColumn({ status, styles, theme }) {
  const closed = status.key === 'cerrada';
  return (
    <FadeInView duration={400} delay={200} style={styles.emptyColumnState}>
      <View style={styles.emptyStateContent}>
        <View style={[styles.emptyStateIconContainer, { backgroundColor: status.color + '15' }]}>
          <Ionicons name={closed ? 'checkmark-circle-outline' : 'document-text-outline'} size={28} color={status.color} />
        </View>
        <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
          {closed ? '¡Todo listo! 🎉' : 'Columna vacía'}
        </Text>
        <Text style={[styles.emptyStateDescription, { color: theme.textSecondary }]}>
          {closed ? 'Todas las tareas están completadas' : 'Aquí aparecerán las tareas \n del estado ' + status.label}
        </Text>
      </View>
    </FadeInView>
  );
}

/**
 * @param {Object} status - { key, label, color, icon }
 * @param {Object} group - { byStatus, filtered, sorted }: todas las del estado, las que
 *   pasan los filtros y esas mismas ya ordenadas
 * @param {Animated.Value} animation - 0 → 1 al entrar la columna
 */
export default function KanbanColumn({
  status, group, animation, isTaskOverdue, compact, onOpen, onQuickEdit, onStatusChange, styles, theme, isDark,
}) {
  const { byStatus, filtered, sorted } = group;
  const shownRate = byStatus.length > 0 ? (filtered.length / byStatus.length) * 100 : 0;
  const overdueCount = sorted.filter((task) => toMs(task.dueAt) < Date.now()).length;

  const animatedStyle = {
    opacity: animation,
    transform: [{ translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
  };

  return (
    <Animated.View
      style={[
        styles.column,
        { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.06)', borderWidth: 0.5 },
        animatedStyle,
      ]}
    >
      <View style={{ height: 3, backgroundColor: status.color, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} />

      <View
        style={styles.columnHeader}
        accessible={true}
        accessibilityLabel={`Columna ${status.label}, ${sorted.length} tareas`}
        accessibilityRole="header"
      >
        <View style={styles.columnTitleContainer}>
          <View style={[styles.columnIconCircle, { backgroundColor: status.color }]} />
          <Text style={[styles.columnTitle, { color: theme.text }]}>{status.label}</Text>
        </View>

        <View style={styles.columnBadges}>
          <View style={[styles.columnCount, { backgroundColor: status.color + '22' }]}>
            <Text style={[styles.columnCountText, { color: status.color }]}>{sorted.length}</Text>
          </View>
          {overdueCount > 0 && (
            <View style={[styles.overdueColumnBadge, { backgroundColor: theme.errorAlpha }]}>
              <Ionicons name="alert-circle" size={10} color={theme.error} />
              <Text style={[styles.columnCountText, { color: theme.error }]}>{overdueCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Cuántas de las tareas del estado se muestran con los filtros actuales */}
      {byStatus.length > 0 && (
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
            <View style={[styles.progressBarFill, { backgroundColor: status.color, width: `${shownRate}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {Math.round(shownRate)}% ({sorted.length}/{byStatus.length})
          </Text>
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => (
          <KanbanCard
            item={item}
            status={status}
            overdue={isTaskOverdue(item)}
            compact={compact}
            onOpen={onOpen}
            onQuickEdit={onQuickEdit}
            onStatusChange={onStatusChange}
            styles={styles}
            theme={theme}
            isDark={isDark}
          />
        )}
        contentContainerStyle={{ paddingBottom: 8 }}
        windowSize={5}
        maxToRenderPerBatch={5}
        removeClippedSubviews={true}
        initialNumToRender={6}
        updateCellsBatchingPeriod={100}
        getItemLayout={getItemLayout}
        ListEmptyComponent={<EmptyColumn status={status} styles={styles} theme={theme} />}
      />
    </Animated.View>
  );
}
