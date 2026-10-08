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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  heading: {
    fontSize: screenWidth > 768 ? 30 : 26,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
    borderRadius: 16,
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
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600'
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
    borderRadius: 24,
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
    fontSize: 14,
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
    fontSize: 11,
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
    fontSize: dimensions.width > 768 ? 14 : 12,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  emptyStateDescription: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
    opacity: 0.65
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
    fontSize: 11,
    fontWeight: '600'
  },
  columnCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    margin: 5,
    marginHorizontal: 8,
    borderRadius: 16,
    position: 'relative',
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
    fontSize: 11,
    fontWeight: '700',
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
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: dimensions.width > 600 ? 8 : 6,
    lineHeight: 20,
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
    borderRadius: 10,
    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
  },
  cardInfoText: {
    color: theme.textSecondary,
    fontSize: 12,
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
    fontSize: 11,
    fontWeight: '600'
  },
  cardTagMore: {
    fontSize: 11,
    fontWeight: '600',
    paddingVertical: 2
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
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    lineHeight: 38,
  },
  statCardLabel: {
    fontSize: 14,
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
    fontSize: 12,
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
    borderRadius: 24,
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
    fontWeight: '700',
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
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
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
    borderRadius: 16,
    borderWidth: 2,
    gap: 6,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickFilterGrid: {
    gap: 12,
  },
  quickFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  quickFilterIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickFilterCardContent: {
    flex: 1,
  },
  quickFilterCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickFilterCardCount: {
    fontSize: 14,
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
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  filterModalClearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterModalApplyBtn: {
    flex: 2,
    borderRadius: 16,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  });
};
