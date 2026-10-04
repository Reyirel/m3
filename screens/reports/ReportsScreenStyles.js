// screens/reports/ReportsScreenStyles.js
// Estilos de ReportsScreen
import { StyleSheet, Platform } from 'react-native';
import { MAX_WIDTHS } from '../../theme/tokens';

export const createStyles = (theme, isDark, isDesktop, isTablet, isDesktopLarge, width, _padding) => {
  const responsiveHeaderPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;
  const responsiveContentPadding = isDesktopLarge ? 48 : isDesktop ? 32 : isTablet ? 24 : 16;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
      alignItems: 'center',
    },
    contentWrapper: {
      flex: 1,
      width: '100%',
      maxWidth: Platform.OS === 'web' ? MAX_WIDTHS.content : width,
      alignSelf: 'center',
    },
    headerGradientInner: {
      paddingHorizontal: responsiveHeaderPadding,
      paddingTop: isDesktop ? 28 : 48,
      paddingBottom: 20,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.18)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleGroup: {
      gap: 2,
    },
    headerLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.7)',
      letterSpacing: 1.5,
    },
    heading: {
      fontSize: isDesktop ? 28 : 24,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
    },
    headerRightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerAlertBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.error,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      gap: 4,
    },
    headerAlertText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
    },
    headerStatMini: {
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.15)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },
    headerStatMiniValue: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    headerStatMiniLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.75)',
      letterSpacing: 0.5,
    },
    scroll: {
      flex: 1,
      width: '100%',
      minHeight: Platform.OS === 'web' ? '100vh' : 'auto',
    },
    scrollContent: {
      paddingHorizontal: responsiveContentPadding,
      paddingTop: 20,
      paddingBottom: 80,
    },
    // ✨ Period Card Premium
    periodCard: {
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      borderWidth: 1,
    },
    periodTabs: {
      flexDirection: 'row',
      gap: 4,
    },
    periodTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 9,
      gap: 5,
    },
    periodTabActive: {
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    periodTabLabel: {
      fontSize: 13,
      fontWeight: '700',
    },
    periodTabFullLabel: {
      fontSize: 12,
      fontWeight: '500',
    },
    // ✨ Stats Grid Premium
    // ✨ Summary Card Premium
    summaryCard: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 14,
      borderWidth: 1,
    },
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    summaryLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    summaryIconBg: {
      width: 44,
      height: 44,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    summaryValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    summaryValue: {
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -1,
    },
    summaryPercent: {
      fontSize: 22,
      fontWeight: '700',
      marginLeft: 2,
    },
    summaryTrend: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressBarBg: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 4,
    },
    // ✨ Metrics Row Compacto
    metricsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
    },
    metricItem: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1.5,
      overflow: 'hidden',
    },
    metricAccentBar: {
      height: 4,
      width: '100%',
      marginBottom: 10,
    },
    metricNumber: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -1,
      textAlign: 'center',
    },
    metricLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: 4,
      marginBottom: 12,
      textAlign: 'center',
      letterSpacing: 0.1,
    },
    // Legacy stat styles (for compatibility)
    chartCard: {
      backgroundColor: theme.glass,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
    },
    // Subtasks Statistics Styles
    // Task Progress Styles
    // Empty State Styles
    emptyStateIcon: {
      width: 56,
      height: 56,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    emptyStateSubtitle: {
      fontSize: 13,
      fontWeight: '500',
    },
    emptyStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 16,
    },
    emptyStat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
    },
    emptyStatLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 2,
    },
    emptyStatValue: {
      fontSize: 20,
      fontWeight: '700',
    },
    emptyStatDivider: {
      width: 1,
      height: 32,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    emptyHelpBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    emptyHelpText: {
      fontSize: 12,
      fontWeight: '500',
      flex: 1,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    emptyCardContainer: {
      minHeight: 240,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyCardContent: {
      alignItems: 'center',
      gap: 12,
    },
    emptyCardIcon: {
      width: 72,
      height: 72,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    emptyCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 4,
    },
    emptyCardSubtitle: {
      fontSize: 13,
      fontWeight: '500',
      textAlign: 'center',
    },
    // New Area Metrics Styles
    areaCardsContainer: {
      gap: 12,
      marginTop: 12,
    },
    alertSection: {
      marginBottom: 16,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      gap: 12,
      borderWidth: 1,
    },
    alertTitle: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 2,
    },
    alertSubtitle: {
      fontSize: 12,
      fontWeight: '500',
      opacity: 0.8,
    },
    selectedAreaHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    selectedAreaStats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    statBlock: {
      flex: 1,
      minWidth: '45%',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
      borderRadius: 8,
      alignItems: 'center',
    },
    statBlockLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginBottom: 4,
    },
    statBlockValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    // ✨ Estilos para botón de exportación
    chartsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 16,
    },
    exportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      gap: 8,
      marginVertical: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    exportButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    // ✨ NUEVOS Estilos Premium para sección jerárquica
    hierarchySectionWrapper: {
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    hierarchySectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 24,
    },
    hierarchySectionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    hierarchySectionTitleContainer: {
      flex: 1,
    },
    hierarchySectionTitle: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
    },
    hierarchySectionSubtitle: {
      fontSize: 13,
      marginTop: 4,
      fontWeight: '500',
    },
    hierarchyCardsRow: {
      flexDirection: isDesktop ? 'row' : 'column',
      gap: 16,
    },
    hierarchyCardWrapper: {
      flex: 1,
    },
    hierarchyCardTouchable: {
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
    hierarchyCardGradient: {
      padding: 20,
      borderRadius: 20,
      minHeight: 240,
    },
    hierarchyGlassOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
    },
    hierarchyCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      zIndex: 1,
    },
    hierarchyCardIconContainer: {
      marginRight: 14,
    },
    hierarchyCardIconBg: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hierarchyCardTitleArea: {
      flex: 1,
    },
    hierarchyCardTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.3,
    },
    hierarchyCardCount: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.75)',
      marginTop: 4,
    },
    hierarchyRateBadge: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },
    hierarchyRateBadgeText: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    hierarchyProgressWrapper: {
      marginBottom: 20,
      zIndex: 1,
    },
    hierarchyProgressTrack: {
      height: 10,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 5,
      overflow: 'hidden',
    },
    hierarchyProgressFill: {
      height: '100%',
      borderRadius: 5,
    },
    hierarchyMetricsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.15)',
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 8,
      marginBottom: 16,
      zIndex: 1,
    },
    hierarchyMetricBox: {
      flex: 1,
      alignItems: 'center',
    },
    hierarchyMetricValue: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    hierarchyMetricLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.7)',
      marginTop: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hierarchyMetricDivider: {
      width: 1,
      height: 36,
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    hierarchyCardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      zIndex: 1,
    },
    hierarchyTapHint: {
      fontSize: 12,
      fontWeight: '500',
      color: 'rgba(255,255,255,0.6)',
    },
    clearFilterButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1.5,
      alignSelf: 'center',
    },
    clearFilterButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    // Legacy styles (mantener compatibilidad)
    // ✨ Quick Metrics Premium Styles
    quickMetricsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 14,
    },
    quickMetricsIconBg: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickMetricsTitleContainer: {
      flex: 1,
    },
    quickMetricsTitle: {
      fontSize: 18,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    quickMetricsSubtitle: {
      fontSize: 12,
      marginTop: 3,
      fontWeight: '500',
    },
    quickMetricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    quickMetricCard: {
      width: isDesktop ? 'calc(33.33% - 10px)' : isTablet ? 'calc(50% - 7px)' : '100%',
      minWidth: isDesktop ? 200 : isTablet ? 180 : 'auto',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      position: 'relative',
      overflow: 'hidden',
    },
    quickMetricStatusBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickMetricAreaName: {
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 14,
      paddingRight: 36,
      lineHeight: 20,
    },
    quickMetricProgressContainer: {
      marginBottom: 12,
    },
    quickMetricProgressTrack: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    quickMetricProgressBar: {
      height: '100%',
      borderRadius: 4,
    },
    quickMetricStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    quickMetricStatItem: {
      alignItems: 'center',
    },
    quickMetricStatValue: {
      fontSize: 18,
      fontWeight: '800',
    },
    quickMetricStatLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    quickMetricStatDivider: {
      width: 1,
      height: 20,
    },
    quickMetricOverdueTag: {
      position: 'absolute',
      bottom: 8,
      left: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.errorAlpha,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    quickMetricOverdueText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.error,
    },
  });
};
