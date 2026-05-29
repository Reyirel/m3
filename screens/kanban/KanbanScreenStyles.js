// screens/kanban/KanbanScreenStyles.js
// Estilos del tablero Kanban — extraídos para mantener KanbanScreen.js manejable

import { StyleSheet, Platform } from 'react-native';

export const createKanbanStyles = (theme, isDark, columnWidth = 300, dimensions = { width: 1200, height: 800 }) => {
  const screenWidth = dimensions.width;

  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100vh',
      overflow: 'hidden'
    } : {})
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    ...(Platform.OS === 'web' ? {
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    } : {})
  },
  headerGradient: {
    paddingHorizontal: screenWidth > 768 ? 20 : 16,
    paddingTop: Platform.OS === 'web' ? 16 : 48,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  headerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 0.2
  },
  heading: {
    fontSize: screenWidth > 768 ? 30 : 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  overdueHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.error,
    paddingLeft: 5,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: 8,
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  overdueHeaderBadgeActive: {
    backgroundColor: theme.errorDark,
    borderColor: '#FFFFFF',
  },
  overdueHeaderPulse: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  overdueHeaderContent: {
    alignItems: 'center',
  },
  overdueHeaderCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  overdueHeaderLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  overdueHeaderCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  priorityBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap'
  },
  areaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120
  },
  areaText: {
    fontSize: 11,
    fontWeight: '600'
  },
  contextMenuContent: {
    padding: 12
  },
  contextTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16
  },
  contextLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '600'
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  statusOption: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600'
  },
  columnsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16
  },
  board: {
    paddingHorizontal: Platform.OS === 'web' ? 10 : (dimensions.width > 480 ? 10 : 6),
    paddingVertical: Platform.OS === 'web' ? 6 : (dimensions.width > 768 ? 8 : 6),
    ...(Platform.OS === 'web' ? (
      dimensions.width > 600 ? {
        display: 'flex',
        flexDirection: 'row',
        gap: dimensions.width > 1200 ? 10 : 8,
        alignItems: 'stretch',
        width: '100%',
        flex: 1
      } : {
        display: 'flex',
        flexDirection: 'row',
        gap: 10,
        alignItems: 'stretch',
        overflowX: 'auto',
        paddingBottom: 6
      }
    ) : {
      flexDirection: 'row',
      gap: dimensions.width > 768 ? 10 : 8
    })
  },
  column: {
    ...(Platform.OS === 'web' ? (
      dimensions.width > 600 ? {
        flex: 1,
        minWidth: 180,
        minHeight: 'auto',
        maxHeight: '100%'
      } : {
        width: columnWidth,
        minWidth: columnWidth,
        flexShrink: 0
      }
    ) : {
      width: columnWidth,
      minWidth: columnWidth,
      marginRight: 0
    }),
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.30 : 0.07,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  columnHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  columnIconCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  columnCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  columnBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  columnCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    position: 'relative'
  },
  overdueColumnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  priorityColumnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    shadowColor: theme.warning,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  progressBarContainer: {
    paddingHorizontal: dimensions.width > 1000 ? 12 : 8,
    paddingBottom: dimensions.width > 768 ? 6 : 4,
    gap: 3
  },
  progressBarBg: {
    height: dimensions.width > 768 ? 5 : 4,
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2
  },
  progressText: {
    fontSize: dimensions.width > 768 ? 9 : 8,
    fontWeight: '600',
    textAlign: 'center'
  },
  emptyColumnState: {
    paddingVertical: dimensions.width > 768 ? 20 : 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10
  },
  emptyStateContent: {
    alignItems: 'center',
    gap: 8
  },
  emptyStateIconContainer: {
    width: dimensions.width > 768 ? 52 : 40,
    height: dimensions.width > 768 ? 52 : 40,
    borderRadius: dimensions.width > 768 ? 26 : 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  },
  emptyStateTitle: {
    fontSize: dimensions.width > 768 ? 13 : 11,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  emptyStateDescription: {
    fontSize: dimensions.width > 768 ? 11 : 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    opacity: 0.65
  },
  emptyColumnText: {
    fontSize: dimensions.width > 768 ? 14 : 12,
    fontWeight: '500',
    opacity: 0.6
  },
  statusAgeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusAgeText: {
    fontSize: 9,
    fontWeight: '600'
  },
  filterToggleBar: {
    paddingHorizontal: dimensions.width > 768 ? 16 : 12,
    paddingVertical: dimensions.width > 768 ? 4 : 2,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: dimensions.width > 768 ? 4 : 2,
    paddingHorizontal: 12
  },
  filterToggleText: {
    fontSize: dimensions.width > 768 ? 13 : 12,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  quickFiltersRow: {
    flexDirection: 'row',
    gap: dimensions.width > 768 ? 8 : 6,
    paddingVertical: dimensions.width > 768 ? 4 : 2,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: dimensions.width > 768 ? 12 : 10,
    paddingVertical: dimensions.width > 768 ? 8 : 6,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickFilterText: {
    fontSize: dimensions.width > 768 ? 12 : 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: dimensions.width > 768 ? 10 : 8,
    paddingVertical: dimensions.width > 768 ? 8 : 6,
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: dimensions.width > 768 ? 11 : 10,
    fontWeight: '600',
  },
  columnCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    margin: 5,
    marginHorizontal: 8,
    borderRadius: 14,
    position: 'relative',
  },
  cardGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    height: 1,
    borderRadius: 1,
    zIndex: 2,
    pointerEvents: 'none',
  },
  cardAccentGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 100,
    zIndex: 1,
    pointerEvents: 'none',
  },
  cardRimGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: dimensions.width > 600 ? 16 : 14,
    borderWidth: 1,
    zIndex: 2,
    pointerEvents: 'none',
  },
  cardDragging: {
    opacity: 0.95,
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 2,
    borderColor: theme.primary
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
    flexWrap: 'wrap'
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  priorityChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  compactPriorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  overdueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  overdueChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  cardTitle: {
    fontSize: dimensions.width > 600 ? 13 : 12,
    fontWeight: '600',
    color: theme.text,
    marginBottom: dimensions.width > 600 ? 8 : 6,
    lineHeight: dimensions.width > 600 ? 18 : 16,
    letterSpacing: -0.1
  },
  cardInfoGrid: {
    gap: 5,
    marginBottom: 8
  },
  cardInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
  },
  cardInfoText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.1
  },
  cardTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6
  },
  cardTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  cardTagText: {
    fontSize: 9,
    fontWeight: '600'
  },
  cardTagMore: {
    fontSize: 9,
    fontWeight: '600',
    paddingVertical: 2
  },
  dragIndicator: {
    position: 'absolute',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2.5,
    borderColor: theme.primary
  },
  dragIndicatorText: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.primary,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  statColorBar: {
    height: 4,
    width: '100%',
  },
  statCardInner: {
    padding: 14,
  },
  statCardCount: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
  },
  statCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 10,
  },
  statBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  statBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  statCardPct: {
    fontSize: 11,
    fontWeight: '600',
  },
  statItem: {
    backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.80)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 10,
    color: theme.text,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  statProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statNumbers: {
    alignItems: 'flex-end',
  },
  statCount: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  statPercentage: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
  },
  filterCompactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenWidth > 768 ? 16 : 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 6,
    minHeight: 44,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  filterChipCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterChipCompactText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  filterModalHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  filterModalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  filterModalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  filterModalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalBody: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchInputPlaceholder: {
    fontSize: 15,
  },
  priorityButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickFilterGrid: {
    gap: 12,
  },
  quickFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  quickFilterIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickFilterCardContent: {
    flex: 1,
  },
  quickFilterCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickFilterCardCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  filterModalClearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  filterModalClearText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterModalApplyBtn: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterModalApplyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  filterModalApplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  });
};
