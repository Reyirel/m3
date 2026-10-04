// screens/kanban/KanbanModals.js
// Ventanas del tablero: filtros y guía de uso.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '../../utils/haptics';

export const EMPTY_KANBAN_FILTERS = {
  searchText: '', area: '', responsible: '', priority: '', overdue: false, dueToday: false, dueThisWeek: false,
};

function ModalHeader({ title, subtitle, onClose, styles, theme }) {
  return (
    <LinearGradient
      colors={theme.gradientPrimary.slice(0, 2)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.filterModalHeader}
    >
      <View style={styles.filterModalHeaderContent}>
        <View>
          <Text style={styles.filterModalTitle}>{title}</Text>
          <Text style={styles.filterModalSubtitle}>{subtitle}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.filterModalCloseBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function SectionTitle({ icon, title, spaced, styles, theme }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, spaced && { marginBottom: 12 }]}>
      <Ionicons name={icon} size={16} color={theme.primary} />
      <Text style={[styles.filterSectionTitle, { color: theme.text }]}>{title}</Text>
    </View>
  );
}

// Filtro de un toque: activo o no
function QuickFilterCard({ icon, title, count, color, activeBg, active, onPress, styles, theme }) {
  return (
    <TouchableOpacity
      onPress={() => { onPress(); hapticLight(); }}
      style={[
        styles.quickFilterCard,
        { backgroundColor: active ? activeBg : theme.cardBackground, borderColor: active ? color : theme.border },
      ]}
    >
      <View style={[styles.quickFilterIconBg, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.quickFilterCardContent}>
        <Text style={[styles.quickFilterCardTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.quickFilterCardCount, { color }]}>{count}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={24} color={color} />}
    </TouchableOpacity>
  );
}

export function KanbanFiltersModal({ visible, onClose, filters, setFilters, taskStats, currentUser, styles, theme, isDark }) {
  const priorities = [
    { key: 'alta', label: 'Urgente', color: theme.error, icon: 'flash' },
    { key: 'media', label: 'Media', color: theme.warning, icon: 'remove' },
    { key: 'baja', label: 'Normal', color: theme.success, icon: 'arrow-down' },
  ];
  const onlyMine = !!currentUser && filters.responsible === currentUser.email;
  const shared = { styles, theme };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.filterModalOverlay}>
        <View style={[styles.filterModalContainer, { backgroundColor: theme.background }]}>
          <ModalHeader title="Filtros" subtitle="Personaliza tu vista" onClose={onClose} {...shared} />

          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <SectionTitle icon="search" title="Buscar tareas" {...shared} />
              <View style={[styles.searchInputContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.searchInputWrapper, { color: theme.text, flex: 1 }]}
                  placeholder="Buscar tareas..."
                  placeholderTextColor={theme.textSecondary}
                  value={filters.searchText}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev, searchText: text }))}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {filters.searchText ? (
                  <TouchableOpacity onPress={() => setFilters((prev) => ({ ...prev, searchText: '' }))} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <View style={styles.filterSection}>
              <SectionTitle icon="flag" title="Prioridad" spaced {...shared} />
              <View style={styles.priorityButtonsRow}>
                {priorities.map((priority) => {
                  const active = filters.priority === priority.key;
                  const count = taskStats.priorityCounts[priority.key];
                  return (
                    <TouchableOpacity
                      key={priority.key}
                      onPress={() => {
                        setFilters({ ...filters, priority: active ? '' : priority.key });
                        hapticLight();
                      }}
                      style={[
                        styles.priorityButton,
                        { backgroundColor: active ? priority.color : theme.cardBackground, borderColor: priority.color },
                      ]}
                    >
                      <Ionicons name={priority.icon} size={18} color={active ? '#FFFFFF' : priority.color} />
                      <Text style={[styles.priorityButtonText, { color: active ? '#FFFFFF' : priority.color }]}>
                        {priority.label}
                      </Text>
                      {count > 0 && (
                        <View style={[styles.priorityBadge, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : priority.color }]}>
                          <Text style={[styles.priorityBadgeText, { color: '#FFFFFF' }]}>{count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <SectionTitle icon="options" title="Filtros rápidos" spaced {...shared} />
              <View style={styles.quickFilterGrid}>
                {taskStats.overdueTasksCount > 0 && (
                  <QuickFilterCard
                    icon="alert-circle"
                    title="Vencidas"
                    count={`${taskStats.overdueTasksCount} tareas`}
                    color={theme.error}
                    activeBg={theme.errorAlpha}
                    active={filters.overdue}
                    onPress={() => setFilters({ ...filters, overdue: !filters.overdue })}
                    {...shared}
                  />
                )}
                {currentUser && (
                  <QuickFilterCard
                    icon="person"
                    title="Mis tareas"
                    count={`${taskStats.myTasksCount} asignadas`}
                    color={theme.primary}
                    activeBg={theme.primaryAlpha}
                    active={onlyMine}
                    onPress={() => setFilters({ ...filters, responsible: onlyMine ? '' : currentUser.email })}
                    {...shared}
                  />
                )}
                <QuickFilterCard
                  icon="today"
                  title="Para hoy"
                  count={`${taskStats.todayCount} tareas`}
                  color={theme.warning}
                  activeBg={theme.warningAlpha}
                  active={filters.dueToday}
                  onPress={() => setFilters({ ...filters, dueToday: !filters.dueToday })}
                  {...shared}
                />
                <QuickFilterCard
                  icon="calendar"
                  title="Esta semana"
                  count={`${taskStats.thisWeekCount} tareas`}
                  color={theme.info}
                  activeBg={theme.infoAlpha}
                  active={filters.dueThisWeek}
                  onPress={() => setFilters({ ...filters, dueThisWeek: !filters.dueThisWeek })}
                  {...shared}
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.filterModalFooter, { backgroundColor: theme.glass, borderTopColor: theme.glassBorder }]}>
            <TouchableOpacity
              onPress={() => {
                setFilters(EMPTY_KANBAN_FILTERS);
                hapticLight();
              }}
              style={[styles.filterModalClearBtn, { borderColor: theme.border }]}
            >
              <Ionicons name="refresh" size={18} color={theme.textSecondary} />
              <Text style={[styles.filterModalClearText, { color: theme.textSecondary }]}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onClose();
                hapticLight();
              }}
              style={styles.filterModalApplyBtn}
            >
              <LinearGradient
                colors={theme.gradientPrimary.slice(0, 2)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterModalApplyGradient}
              >
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.filterModalApplyText}>Aplicar filtros</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const helpItems = (theme) => [
  { icon: 'grid', color: theme.primary, title: 'Columnas de estado', desc: 'Cada columna representa un estado: Pendiente → En proceso → En revisión → Cerrada. Las tareas se muestran en su columna actual.' },
  { icon: 'options', color: '#6366F1', title: 'Filtros avanzados', desc: 'Toca el ícono ⊞ para filtrar por búsqueda, área, responsable, prioridad, vencidas o fecha.' },
  { icon: 'person', color: theme.info, title: 'Mis tareas', desc: 'El chip "Mis tareas" en la barra de filtros muestra solo las tareas asignadas a ti.' },
  { icon: 'warning', color: theme.warning, title: 'Riesgo de retraso (IA)', desc: 'Cada tarea muestra un badge de riesgo bajo/medio/alto calculado con IA basado en el historial del área.' },
  { icon: 'time-outline', color: theme.error, title: 'Ordenamiento', desc: 'Cambia entre ordenar por fecha (⏱) o por prioridad (⚑) con el botón en el encabezado.' },
  { icon: 'stats-chart', color: theme.success, title: 'Estadísticas', desc: 'Activa el panel de estadísticas para ver tasas de completitud, tareas vencidas y prioridad por columna.' },
];

export function KanbanHelpModal({ visible, onClose, styles, theme }) {
  const items = helpItems(theme);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.filterModalOverlay}>
        <View style={[styles.filterModalContainer, { backgroundColor: theme.background, maxHeight: '80%' }]}>
          <ModalHeader title="Guía del Tablero Kanban" subtitle="Cómo usar cada elemento" onClose={onClose} styles={styles} theme={theme} />
          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            {items.map((item, index) => (
              <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: index < items.length - 1 ? 1 : 0, borderBottomColor: theme.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: item.color + '20', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.text, marginBottom: 2 }}>{item.title}</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.filterModalFooter}>
            <TouchableOpacity style={[styles.filterModalApply, { flex: 1 }]} onPress={onClose}>
              <LinearGradient colors={theme.gradientPrimary.slice(0, 2)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.filterModalApplyGradient, { borderRadius: 16 }]}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.filterModalApplyText}>¡Entendido!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
