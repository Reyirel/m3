// screens/calendar/CalendarScreenStyles.js
// Estilos de CalendarScreen
import { StyleSheet, Platform } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../../theme/tokens';

export const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    } : {})
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: isDesktop ? 900 : '100%',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    } : {})
  },
  // Header con glassmorphism
  headerGradientInner: {
    borderBottomLeftRadius: RADIUS.lg + 4,
    borderBottomRightRadius: RADIUS.lg + 4,
    ...SHADOWS.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxxl : 52,
    paddingBottom: SPACING.xl
  },
  heading: { 
    fontSize: isDesktop ? 36 : Platform.OS === 'android' ? 32 : 30, 
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  scrollContent: {
    padding: isDesktop ? 24 : isTablet ? 16 : 14,
    paddingBottom: isDesktop ? 48 : 40,
  },
  // Quick Stats Inline - Compacto
  // Month controls con glassmorphism premium
  monthControlsWrapper: {
    marginBottom: SPACING.lg,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderWidth: 0.5,
    borderColor: theme.glassBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.20 : 0.06,
    shadowRadius: 8,
    ...Platform.select({ android: { elevation: 2 } }),
  },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
  },
  monthDisplay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  monthText: {
    fontSize: isDesktop ? 20 : 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  yearText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  // Calendario principal con glassmorphism premium
  calendarContainer: {
    borderRadius: isDesktop ? 24 : 20,
    padding: isDesktop ? 20 : 14,
    marginBottom: SPACING.lg,
    backgroundColor: isDark ? theme.card : '#FFFFFF',
    borderWidth: 0.5,
    borderColor: theme.glassBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.30 : 0.08,
    shadowRadius: 12,
    ...Platform.select({ android: { elevation: 4 } }),
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 6,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: isDark ? 'rgba(235,235,245,0.55)' : 'rgba(60,60,67,0.55)',
  },
  weekDayWeekend: {
    color: theme.primary,
    opacity: 0.8,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayWrapper: {
    width: `${100 / 7}%`,
    aspectRatio: isDesktop ? 1.1 : 1.05,
    padding: isDesktop ? 4 : 3,
  },
  emptyDay: {
    width: `${100 / 7}%`,
    aspectRatio: isDesktop ? 1.1 : 1.05,
    padding: isDesktop ? 4 : 3,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: isDesktop ? 14 : 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
    borderWidth: 0.5,
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    position: 'relative',
    overflow: 'hidden',
  },
  dayWithTasks: {
    backgroundColor: isDark ? 'rgba(159,34,65,0.18)' : 'rgba(159,34,65,0.07)',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(192,34,62,0.55)' : 'rgba(159,34,65,0.40)',
  },
  dayWeekend: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(159,34,65,0.03)',
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(159,34,65,0.12)',
  },
  dayToday: {
    backgroundColor: theme.primary,
    borderWidth: 0,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.50,
    shadowRadius: 10,
    ...Platform.select({ android: { elevation: 6 } }),
  },
  dayHighPriority: {
    backgroundColor: isDark ? 'rgba(255,59,48,0.22)' : 'rgba(255,59,48,0.10)',
    borderWidth: 2,
    borderColor: theme.error,
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  dayOverdue: {
    backgroundColor: isDark ? 'rgba(255,149,0,0.20)' : 'rgba(255,149,0,0.10)',
    borderColor: theme.warning,
    borderWidth: 1.5,
  },
  dayCompleted: {
    backgroundColor: isDark ? 'rgba(48,209,88,0.16)' : 'rgba(52,199,89,0.10)',
    borderColor: isDark ? '#30D158' : theme.success,
    borderWidth: 1.5,
  },
  dayTaskCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    zIndex: 2,
  },
  dayTaskCountToday: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dayTaskCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isDesktop ? 8 : 6,
    zIndex: 1,
  },
  dayNumber: {
    fontSize: isDesktop ? 18 : isTablet ? 16 : 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  dayNumberWeekend: {
    color: theme.primary,
    fontWeight: '700',
  },
  dayNumberToday: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: isDesktop ? 20 : isTablet ? 18 : 17,
  },
  dayNumberAlert: {
    color: theme.error,
    fontWeight: '800',
  },
  dayNumberWarning: {
    color: theme.warning,
    fontWeight: '700',
  },
  taskIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: isDesktop ? 4 : 3,
    marginTop: isDesktop ? 4 : 2,
    minHeight: isDesktop ? 12 : 10,
    flexWrap: 'wrap',
  },
  taskDot: {
    width: isDesktop ? 8 : 7,
    height: isDesktop ? 8 : 7,
    borderRadius: 99,
    backgroundColor: theme.success,
  },
  taskDotHigh: {
    backgroundColor: theme.error,
  },
  taskDotMedium: {
    backgroundColor: theme.warning,
  },
  taskDotLow: {
    backgroundColor: theme.success,
  },
  taskDotToday: {
    borderColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1.5,
    width: isDesktop ? 9 : 8,
    height: isDesktop ? 9 : 8,
  },
  moreTasksBadge: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(159,34,65,0.1)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  moreTasksBadgeToday: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  moreTasks: {
    fontSize: isDesktop ? 10 : 9,
    fontWeight: '700',
    color: theme.primary,
  },
  // Leyenda con glassmorphism premium
  legend: {
    marginTop: SPACING.sm,
    padding: isDesktop ? 20 : 16,
    borderRadius: isDesktop ? 16 : 14,
    backgroundColor: isDark ? 'rgba(30, 30, 35, 0.9)' : theme.glassStrong,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.15 : 0.06,
    shadowRadius: 10,
    ...Platform.select({ android: { elevation: 3 } }),
  },
  legendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.glass : theme.glassStrong,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: isDark ? theme.glass : theme.glassStrong,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal con glassmorphism
  modalBlurOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.lg + 8,
    borderTopRightRadius: RADIUS.lg + 8,
    padding: isDesktop ? 28 : 22,
    paddingBottom: isDesktop ? 40 : 34,
    maxHeight: '85%',
    ...SHADOWS.xl,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  modalDateBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDateDay: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 24,
  },
  modalDateMonth: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  modalTitle: {
    fontSize: isDesktop ? 18 : 17,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalDayStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  modalStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  modalStatText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  modalEmptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    maxHeight: 450,
  },
  // Modal Task Cards con glassmorphism
  modalTaskCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  modalTaskHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  modalTaskPriority: {
    width: 4,
    borderRadius: 2,
    backgroundColor: theme.success,
    alignSelf: 'stretch',
  },
  modalTaskPriorityHigh: {
    backgroundColor: theme.error,
  },
  modalTaskPriorityMedium: {
    backgroundColor: theme.warning,
  },
  modalTaskPriorityLow: {
    backgroundColor: theme.success,
  },
  modalTaskContent: {
    flex: 1,
  },
  modalTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 10,
  },
  modalTaskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  modalTaskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalTaskMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalTaskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
  },
  modalTaskStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(159, 34, 65, 0.2)' : 'rgba(159, 34, 65, 0.1)',
  },
  modalTaskStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTaskStatusClosed: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
  },
  modalTaskStatusInProgress: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
  },
  modalTaskStatusReview: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
  },
  // Compact view styles
  modalTaskCardCompact: {
    padding: 10,
    marginBottom: 6,
    borderRadius: 10,
  },
  compactTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  compactPriorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactTaskTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  // Modal filter styles
  modalFiltersRow: {
    marginBottom: 12,
  },
  modalFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  modalFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modalFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalFilterCount: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalCompactToggle: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
});
