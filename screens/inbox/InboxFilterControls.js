// screens/inbox/InboxFilterControls.js
// Filtros de la bandeja: la ventana para elegirlos y los chips que muestran los activos.
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { statusLabel } from '../../utils/taskStatus';
import { EMPTY_FILTERS, hasActiveFilters, toggleFilterValue } from './inboxFilters';

const STATUS_OPTIONS = ['pendiente', 'en_proceso', 'cerrada'];
const PRIORITY_OPTIONS = ['baja', 'media', 'alta'];

const priorityColor = (priority, theme) => (
  priority === 'alta' ? theme.error : priority === 'media' ? theme.warning : theme.success
);

function FilterGroup({ icon, title, badgeColor, options, selected, colorFor, labelFor, onToggle, styles, theme }) {
  return (
    <View style={styles.filterGroup}>
      <View style={styles.filterGroupHeader}>
        <Ionicons name={icon} size={16} color={theme.primary} />
        <Text style={[styles.filterTitle, { color: theme.text }]}>{title}</Text>
        <View style={[styles.filterBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.filterBadgeText}>{selected.length}</Text>
        </View>
      </View>
      <View style={styles.filterOptions}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.filterOption, active && { ...styles.filterOptionActive, backgroundColor: colorFor(option) }]}
              onPress={() => onToggle(option)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {active && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                <Text style={[styles.filterOptionText, active && { color: '#FFFFFF', fontWeight: '700' }]}>
                  {labelFor ? labelFor(option) : option}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function InboxFiltersModal({ visible, onClose, filters, onChange, areas, styles, theme, isDark }) {
  const toggle = (key) => (value) => onChange(toggleFilterValue(filters, key, value));
  const separator = <View style={[styles.filterSeparator, { backgroundColor: theme.border }]} />;
  const shared = { styles, theme };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="funnel" size={24} color={theme.primary} style={{ marginRight: 10 }} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filtros Avanzados</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
              <Ionicons name="close-circle" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
            <FilterGroup
              icon="bookmark-outline"
              title="ESTADO DE TAREA"
              badgeColor={theme.primary}
              options={STATUS_OPTIONS}
              selected={filters.status}
              colorFor={() => theme.primary}
              labelFor={statusLabel}
              onToggle={toggle('status')}
              {...shared}
            />
            {separator}

            <FilterGroup
              icon="flash-outline"
              title="NIVEL DE PRIORIDAD"
              badgeColor={theme.warning}
              options={PRIORITY_OPTIONS}
              selected={filters.priority}
              colorFor={(priority) => priorityColor(priority, theme)}
              onToggle={toggle('priority')}
              {...shared}
            />
            {separator}

            {areas.length > 0 && (
              <>
                <FilterGroup
                  icon="business-outline"
                  title="DIRECCIÓN O ÁREA"
                  badgeColor={theme.info}
                  options={areas}
                  selected={filters.area}
                  colorFor={() => theme.info}
                  onToggle={toggle('area')}
                  {...shared}
                />
                {separator}
              </>
            )}

            <View style={styles.filterGroup}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  styles.filterOptionLarge,
                  { marginTop: 0 },
                  filters.overdue && { ...styles.filterOptionActive, backgroundColor: theme.error },
                ]}
                onPress={() => onChange({ ...filters, overdue: !filters.overdue })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons
                    name={filters.overdue ? 'alert-circle' : 'alert-circle-outline'}
                    size={18}
                    color={filters.overdue ? '#FFFFFF' : theme.error}
                  />
                  <Text style={[
                    styles.filterOptionText,
                    styles.filterOptionLargeText,
                    filters.overdue && { color: '#FFFFFF', fontWeight: '700' },
                  ]}>
                    {filters.overdue ? '✓ MOSTRAR SOLO VENCIDAS' : 'MOSTRAR SOLO TAREAS VENCIDAS'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {hasActiveFilters(filters) && (
              <>
                {separator}
                <TouchableOpacity
                  style={[styles.clearFiltersBtn, { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(159, 34, 65, 0.05)' }]}
                  onPress={() => onChange(EMPTY_FILTERS)}
                >
                  <Ionicons name="refresh" size={18} color={theme.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.clearFiltersBtnText, { color: theme.primary }]}>RESETEAR TODOS LOS FILTROS</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.modalFooterBtn, styles.modalFooterBtnSecondary, { borderColor: theme.textSecondary }]}
              onPress={onClose}
            >
              <Text style={[styles.modalFooterBtnText, { color: theme.text }]}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalFooterBtn, styles.modalFooterBtnPrimary, { backgroundColor: theme.primary }]}
              onPress={onClose}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={[styles.modalFooterBtnText, { color: '#FFFFFF' }]}>APLICAR FILTROS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Chip({ color, icon, label, onPress, styles }) {
  return (
    <TouchableOpacity style={[styles.activeFilterChip, { backgroundColor: color }]} onPress={onPress}>
      {icon && <Ionicons name={icon} size={14} color="#FFFFFF" />}
      <Text style={styles.activeFilterChipText} numberOfLines={1}>{label}</Text>
      <Ionicons name="close" size={14} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

/** Chips con la búsqueda y los filtros activos; tocar uno lo quita */
export function ActiveFilterChips({ filters, onChange, searchText, onSearchChange, styles, theme }) {
  if (!hasActiveFilters(filters) && !searchText) return null;
  const remove = (key, value) => () => onChange(toggleFilterValue(filters, key, value));

  return (
    <View style={styles.activeFiltersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersScroll}>
        {!!searchText && (
          <Chip color={theme.primary} icon="search" label={`"${searchText}"`} onPress={() => onSearchChange('')} styles={styles} />
        )}
        {filters.overdue && (
          <Chip color={theme.error} icon="alert-circle" label="Vencidas" onPress={() => onChange({ ...filters, overdue: false })} styles={styles} />
        )}
        {filters.status.map((status) => (
          <Chip key={status} color={theme.info} label={status} onPress={remove('status', status)} styles={styles} />
        ))}
        {filters.priority.map((priority) => (
          <Chip key={priority} color={priorityColor(priority, theme)} label={priority} onPress={remove('priority', priority)} styles={styles} />
        ))}
        {filters.area.map((area) => (
          <Chip key={area} color={theme.secondary} label={area.substring(0, 15)} onPress={remove('area', area)} styles={styles} />
        ))}
        <TouchableOpacity
          style={[styles.clearAllChip, { borderColor: theme.primary }]}
          onPress={() => {
            onChange(EMPTY_FILTERS);
            onSearchChange('');
          }}
        >
          <Text style={[styles.clearAllChipText, { color: theme.primary }]}>Limpiar todo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
