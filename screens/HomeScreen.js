// screens/HomeScreen.js
// Inicio: resumen de lo que pide atención hoy (vencidas, vencen hoy, en revisión y
// próximas). Los recuadros de arriba filtran esta misma pantalla: al tocar uno se ven
// todas las tareas de ese grupo, y al tocarlo otra vez vuelve el resumen. La lista
// completa con sus acciones está en la Bandeja. Al buscar se muestran los resultados.
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Animated, Platform, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import TaskCard from '../components/TaskCard';
import { TaskCardSkeleton } from '../components/ShimmerEffect';
import EmptyState from '../components/EmptyState';
import HomeHeader, { HomeFilters } from '../components/ui/HomeHeader';
import OnboardingTour from '../components/OnboardingTour';

import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { useResponsive } from '../utils/responsive';
import { useNow } from '../hooks/useNow';
import { hapticLight, hapticMedium } from '../utils/haptics';
import { MAX_WIDTHS, RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';
import { ACTIVE_OPACITY, DURATION, spring, timing } from '../theme/motion';
import { buildHomeSummary, searchTasks } from './home/homeSummary';

// Tareas que se muestran por sección en el resumen; al filtrar se ven todas
const SECTION_LIMIT = 4;
const SEARCH_LIMIT = 30;

export default function HomeScreen({ navigation }) {
  const { theme } = useTheme();
  const { isDesktop, isTablet } = useResponsive();
  const isGrid = isDesktop || isTablet;
  const { tasks, isLoading, currentUser } = useTasks();
  const isAdmin = currentUser?.role === 'admin';
  const [searchText, setSearchText] = useState('');
  // Grupo elegido en los recuadros (null = resumen completo)
  const [activeGroup, setActiveGroup] = useState(null);
  const searchRef = useRef(null);
  // Avanza cada minuto: una tarea pasa sola de "vence hoy" a "vencida"
  const now = useNow(true);

  // Cmd+K / Ctrl+K → enfocar búsqueda (solo web)
  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      timing(opacity, 1, { duration: DURATION.slow, easing: Easing.out(Easing.cubic) }),
      spring(slide, 0),
    ]).start();
  }, [opacity, slide]);

  const summary = useMemo(() => buildHomeSummary(tasks, currentUser, now), [tasks, currentUser, now]);
  const results = useMemo(() => searchTasks(tasks, currentUser, searchText), [tasks, currentUser, searchText]);
  const searching = searchText.trim() !== '';

  const openTask = useCallback((task) => {
    navigation.navigate('TaskDetail', { task, taskId: task.id });
  }, [navigation]);

  const openInbox = useCallback(() => {
    hapticLight();
    navigation.navigate('Inbox');
  }, [navigation]);

  // Tocar un recuadro filtra; tocarlo de nuevo quita el filtro
  const toggleGroup = useCallback((key) => {
    hapticLight();
    setActiveGroup((current) => (current === key ? null : key));
  }, []);

  const goToCreate = useCallback(() => {
    hapticMedium();
    navigation.navigate('TaskDetail', {});
  }, [navigation]);

  const header = (
    <HomeHeader
      userName={currentUser?.displayName || 'Usuario'}
      role={currentUser?.role?.toUpperCase() || 'USUARIO'}
      onSearch={setSearchText}
      searchText={searchText}
      onProfilePress={() => navigation.navigate('Profile')}
      onNotificationsPress={() => navigation.navigate('Notifications')}
      searchRef={searchRef}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
          {header}
          <View style={{ paddingTop: SPACING.lg }} accessibilityLabel="Cargando tareas">
            {[1, 2, 3, 4].map(i => <TaskCardSkeleton key={i} />)}
          </View>
        </View>
      </View>
    );
  }

  const groups = {
    overdue: { title: 'Vencidas', list: summary.overdue },
    today: { title: 'Vencen hoy', list: summary.today },
    review: { title: 'En revisión', list: summary.review },
    progress: { title: 'En proceso', list: summary.inProgress },
    upcoming: { title: 'Próximos 7 días', list: summary.upcoming },
  };

  const tiles = [
    { key: 'overdue', label: 'Vencidas', short: 'Vencidas', icon: 'alert-circle', color: theme.error },
    { key: 'today', label: 'Vencen hoy', short: 'Hoy', icon: 'today', color: theme.warningText },
    { key: 'review', label: 'En revisión', short: 'Revisión', icon: 'eye', color: theme.statusReview },
    { key: 'progress', label: 'En proceso', short: 'Proceso', icon: 'play-circle', color: theme.statusInProgress },
  ].map((tile) => ({ ...tile, count: groups[tile.key].list.length, active: activeGroup === tile.key }));

  const cards = (list) => (
    <View style={isGrid ? styles.grid : undefined}>
      {list.map((task) => (
        <View key={task.id} style={isGrid ? styles.gridCell : undefined}>
          <TaskCard task={task} onPress={openTask} />
        </View>
      ))}
    </View>
  );

  // `expanded`: el grupo elegido en los recuadros, con todas sus tareas
  const section = (key, expanded = false) => {
    const { title, list } = groups[key];
    if (list.length === 0 && !expanded) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
            {title}
            <Text style={{ color: theme.textTertiary }}>{`  ${list.length}`}</Text>
          </Text>
          {(expanded || list.length > SECTION_LIMIT) && (
            <TouchableOpacity
              onPress={() => toggleGroup(key)}
              activeOpacity={ACTIVE_OPACITY}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Volver al resumen' : `Ver todas: ${title}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.seeAll, { color: theme.primary }]}>{expanded ? 'Ver resumen' : 'Ver todas'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {list.length === 0 ? (
          <Text style={[styles.emptyGroup, { color: theme.textSecondary }]}>No hay tareas en este grupo.</Text>
        ) : cards(expanded ? list : list.slice(0, SECTION_LIMIT))}
      </View>
    );
  };

  const nothingUrgent = summary.overdue.length + summary.today.length + summary.review.length + summary.upcoming.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.contentWrapper, { maxWidth: isDesktop ? MAX_WIDTHS.content : '100%' }]}>
        {header}

        <Animated.View style={{ flex: 1, opacity, transform: [{ translateY: slide }] }}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* En el celular el buscador va aquí; en pantalla ancha, en el encabezado */}
            <HomeFilters onSearch={setSearchText} searchText={searchText} searchRef={searchRef} />

            {searching ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]} accessibilityRole="header">
                    Resultados
                    <Text style={{ color: theme.textTertiary }}>{`  ${results.length}`}</Text>
                  </Text>
                </View>
                {results.length === 0 ? (
                  <EmptyState
                    icon="search-outline"
                    title="Sin resultados"
                    message="Ninguna tarea coincide con la búsqueda."
                    quickAction={{
                      label: 'Borrar búsqueda',
                      icon: 'close-circle-outline',
                      onPress: () => { searchRef.current?.clear(); setSearchText(''); },
                    }}
                  />
                ) : cards(results.slice(0, SEARCH_LIMIT))}
              </View>
            ) : (
              <>
                <View style={styles.tiles}>
                  {tiles.map((tile) => (
                    <TouchableOpacity
                      key={tile.key}
                      onPress={() => toggleGroup(tile.key)}
                      activeOpacity={ACTIVE_OPACITY}
                      style={[
                        styles.tile,
                        isGrid && styles.tileWide,
                        { backgroundColor: theme.card, borderColor: theme.glassBorder, shadowColor: theme.shadowColor },
                        tile.active && { backgroundColor: theme.primaryAlpha, borderColor: theme.primary },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tile.active }}
                      accessibilityLabel={`${tile.label}: ${tile.count}`}
                      accessibilityHint={tile.active ? 'Toca para volver al resumen' : 'Toca para ver solo estas tareas'}
                    >
                      {isGrid ? (
                        <>
                          <Ionicons name={tile.icon} size={20} color={tile.count > 0 ? tile.color : theme.textMuted} />
                          <Text style={[styles.tileCountWide, { color: tile.count > 0 ? theme.text : theme.textTertiary }]}>
                            {tile.count}
                          </Text>
                          <Text style={[styles.tileLabelWide, { color: theme.textSecondary }]} numberOfLines={1}>
                            {tile.label}
                          </Text>
                        </>
                      ) : (
                        <>
                          {/* Celular: una sola fila baja; el color del número ya indica el tipo */}
                          <Text style={[styles.tileCount, { color: tile.count > 0 ? tile.color : theme.textTertiary }]}>
                            {tile.count}
                          </Text>
                          <Text style={[styles.tileLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                            {tile.short}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {activeGroup ? section(activeGroup, true) : (
                  <>
                    {section('overdue')}
                    {section('today')}
                    {section('review')}
                    {section('upcoming')}

                    {nothingUrgent && (
                      <EmptyState
                        icon="checkmark-done-circle-outline"
                        title="Todo al día"
                        message={
                          summary.openCount > 0
                            ? 'No hay tareas vencidas ni por vencer esta semana.'
                            : isAdmin
                              ? 'Aún no hay tareas abiertas. Crea la primera para asignarla a un área.'
                              : 'No tienes tareas abiertas por ahora.'
                        }
                        quickAction={summary.openCount === 0 && isAdmin ? {
                          label: 'Crear tarea',
                          icon: 'add-circle-outline',
                          onPress: goToCreate,
                        } : undefined}
                      />
                    )}
                  </>
                )}

                {summary.openCount > 0 && (
                  <TouchableOpacity
                    onPress={openInbox}
                    activeOpacity={ACTIVE_OPACITY}
                    style={[styles.inboxLink, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="file-tray-full-outline" size={20} color={theme.primary} />
                    <Text style={[styles.inboxLinkText, { color: theme.text }]}>
                      {`Ver mi bandeja (${summary.openCount} ${summary.openCount === 1 ? 'tarea abierta' : 'tareas abiertas'})`}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>

      {/* Botón flotante: crear tarea (solo administrador) */}
      {isAdmin && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.shadowColor }]}
          onPress={goToCreate}
          activeOpacity={ACTIVE_OPACITY}
          accessibilityRole="button"
          accessibilityLabel="Nueva tarea"
        >
          <Ionicons name="add" size={28} color={theme.buttonPrimaryText} />
        </TouchableOpacity>
      )}
      {currentUser && <OnboardingTour userRole={currentUser.role} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
  },
  content: {
    paddingBottom: 100,
  },
  tiles: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  // Celular: los cuatro en una fila baja, para que las tareas se vean sin desplazarse
  tile: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tileWide: {
    alignItems: 'flex-start',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 2,
  },
  tileCount: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  tileLabel: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
  },
  tileCountWide: {
    ...TYPOGRAPHY.h1,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  tileLabelWide: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '500',
  },
  section: {
    marginTop: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyGroup: {
    ...TYPOGRAPHY.bodySmall,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  seeAll: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  gridCell: {
    width: '50%',
  },
  inboxLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inboxLinkText: {
    ...TYPOGRAPHY.body,
    flex: 1,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
});
