// screens/kanban/HomeScreenStyles.js
import { StyleSheet, Platform } from 'react-native';
import { SPACING, RADIUS, SHADOWS, MAX_WIDTHS } from '../../theme/tokens';

export const createHomeStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%'
  },
  headerGradient: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.40,
    shadowRadius: 20,
    elevation: 12,
    paddingHorizontal: padding,
    paddingTop: isDesktop ? SPACING.xxl : 48,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  headerHighlight: {
    position: 'absolute',
    top: 0,
    left: 30,
    right: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerGreeting: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
  },
  statPillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.info,
  },
  statPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.1,
  },
  statPillDanger: {
    backgroundColor: 'rgba(255,59,48,0.32)',
    borderWidth: 1,
    borderColor: 'rgba(255,100,100,0.45)',
  },
  statPillSuccess: {
    backgroundColor: 'rgba(52,199,89,0.22)',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionLabelTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 1,
  },
  sectionLabelSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  sectionLabelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  greeting: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    opacity: 0.95,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  headingSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heading: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1.2,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
    gap: SPACING.xs,
    marginRight: SPACING.md,
    ...SHADOWS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: theme.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  urgentBadgeText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },
  urgentAlert: {
    marginHorizontal: padding,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    ...SHADOWS.sm
  },
  urgentAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  urgentAlertTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  urgentAlertText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: theme.warning,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12
  },
  addButtonGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6
  },
  listContent: {
    padding: padding,
    paddingTop: SPACING.sm,
    paddingBottom: 80
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: padding * 2
  },
  emptyText: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.text,
    marginBottom: 12,
    letterSpacing: -0.8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.2
  },
  // Bento Grid Styles
  bentoGrid: {
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
    paddingHorizontal: padding
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  bentoCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
    width: isDesktop ? (screenWidth > 1440 ? '23%' : '32%') : isTablet ? '48%' : '100%',
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.2 : 0.15,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  },
  bentoLarge: {
    flex: 2,
    minHeight: 180
  },
  bentoMedium: {
    flex: 1,
    minHeight: 180
  },
  bentoSmall: {
    flex: 1,
    minHeight: 140
  },
  bentoWide: {
    flex: 1,
    backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)',
    padding: 16,
    minHeight: 100,
    shadowColor: isDark ? theme.primary : '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: isDark ? 0.15 : 0.08,
    shadowRadius: 10,
    elevation: 3
  },
  bentoGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-start'
  },
  bentoGradientSmall: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  bentoIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  bentoIconCircleSmall: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  bentoContent: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  bentoTitleLarge: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3
  },
  bentoTitleSmall: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.6,
    marginBottom: 10,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  bentoNumberLarge: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -3.2,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8
  },
  bentoNumberMedium: {
    fontSize: 58,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.8,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoNumberSmall: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2.2,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6
  },
  bentoSubtext: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  statItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    opacity: 0.9,
  },
  bentoLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  areasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14
  },
  areaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.08)',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    maxWidth: '100%',
    flexShrink: 1
  },
  areaName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.text,
    letterSpacing: 0.2,
    flex: 1,
    flexShrink: 1
  },
  areaBadge: {
    backgroundColor: theme.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center'
  },
  areaCount: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  // Estilos para la alerta información
  infoAlert: {
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.md,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  infoAlertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  infoAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  infoAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    letterSpacing: -0.3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
    paddingTop: 12,
    paddingHorizontal: 4,
    gap: 10,
    borderTopWidth: 1,
  },
  sectionIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  taskCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 32,
    alignItems: 'center',
  },
  taskCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBarContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: theme.glassShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 104,
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  urgentModalContent: {
    width: '100%',
    maxWidth: MAX_WIDTHS.modal,
    maxHeight: '80%',
    borderRadius: RADIUS.xl,
    ...SHADOWS.xl
  },
  urgentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 59, 48, 0.2)'
  },
  urgentModalTitle: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  urgentModalSubtitle: {
    fontSize: 14,
    fontWeight: '500'
  },
  urgentModalScroll: {
    padding: 20
  },
  urgentTaskCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  urgentTaskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  urgentTaskTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  urgentTaskArea: {
    fontSize: 13,
    fontWeight: '500'
  },
  urgentTaskTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 6
  },
  urgentTaskTime: {
    fontSize: 14,
    fontWeight: '700'
  },
  urgentModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)'
  },
  urgentModalButton: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  urgentModalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  // Estilos para filtros rápidos
  compactToggle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  quickFiltersBand: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.40)',
  },
  bandSeparator: {
    height: 1,
    width: '100%',
  },
  quickFiltersScroll: {
    marginTop: 0,
    marginBottom: 0,
  },
  quickFiltersContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  quickFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  quickFilterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickFilterBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  quickFilterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // IA Feature 1: SmartBriefing
  briefingCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  briefingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  briefingHeadline: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 19,
  },
  briefingDetail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  briefingModal: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
});

