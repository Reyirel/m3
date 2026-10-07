// screens/inbox/MyInboxScreenStyles.js
// Estilos de MyInboxScreen
import { StyleSheet } from 'react-native';
import { SPACING, RADIUS, SHADOWS } from '../../theme/tokens';

export const createStyles = (theme, isDark, isDesktop, isTablet, screenWidth, padding) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
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
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: padding,
    paddingTop: isDesktop ? 32 : 48,
    paddingBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.3,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Búsqueda compacta
  searchCompact: {
    paddingHorizontal: padding,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  // Tarjeta usuario y búsqueda unificada
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 10,
  },
  searchDivider: {
    width: 1,
    height: 20,
  },
  filterIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Barra de acciones
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: padding,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionsBarLeft: {
    flex: 1,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bulkActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Item wrapper para selección + card
  itemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
    borderRadius: 24,
  },
  selectionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 8,
  },
  // Quick Stats
  // Active Filters Chips
  activeFiltersContainer: {
    marginTop: 10,
    paddingHorizontal: padding,
  },
  activeFiltersScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    maxWidth: 100,
  },
  clearAllChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  clearAllChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: isDesktop ? 20 : isTablet ? 16 : 16,
    paddingTop: isDesktop ? 32 : 24,
    paddingBottom: 80
  },
  messageCard: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
    borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E9D5FF',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageTaskTitle: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    color: theme.text,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  messageAuthor: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: theme.textSecondary,
    fontWeight: '600',
    letterSpacing: -0.2
  },
  messageTime: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.textTertiary,
    fontWeight: '500'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xxl || 32,
    borderTopRightRadius: RADIUS.xxl || 32,
    maxHeight: '85%',
    padding: 0,
    paddingBottom: 32,
    ...SHADOWS.xl,
    backgroundColor: theme.surface,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isDesktop ? SPACING.xl : SPACING.lg,
    paddingBottom: SPACING.xl,
    borderBottomWidth: 2,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.15)' : '#F3E5F5'
  },
  modalTitle: {
    fontSize: isDesktop ? 24 : 26,
    fontWeight: '900',
    color: theme.text,
    letterSpacing: -0.6,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  modalScroll: {
    padding: isDesktop ? SPACING.xl : SPACING.lg
  },
  // 🔍 ESTILOS DE BÚSQUEDA Y FILTROS
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '500',
    color: theme.text,
  },
  filterGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  filterBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  filterSeparator: {
    height: 1,
    marginVertical: SPACING.md,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    opacity: 0.8,
    textTransform: 'uppercase',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterGroup: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.glassBorder,
    backgroundColor: theme.glass,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  filterOptionLarge: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.sm,
  },
  filterOptionActive: {
    borderColor: 'transparent',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: 0.3,
  },
  filterOptionLargeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    marginTop: SPACING.md,
    backgroundColor: 'transparent',
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // 🎨 ESTILOS DEL FOOTER DEL MODAL
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    backgroundColor: theme.card,
    borderTopColor: theme.border,
  },
  modalFooterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    shadowColor: theme.glassShadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  modalFooterBtnSecondary: {
    backgroundColor: 'transparent',
    borderColor: theme.textSecondary,
  },
  modalFooterBtnPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  modalFooterBtnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  // 🎨 ESTILOS MODAL CONFIRMACIÓN CERRAR
  // 🎨 ESTILOS MODAL AYUDA
  helpModalContent: {
    width: isDesktop ? 420 : '90%',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  helpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  helpModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  helpModalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  helpModalIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpModalTextContainer: {
    flex: 1,
  },
  helpModalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  helpModalItemDesc: {
    fontSize: 14,
    lineHeight: 18,
  },
  helpModalCloseBtn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  helpModalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Estilos para filtros rápidos
  compactToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
