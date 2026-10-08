// screens/reports/AnalyticsScreenStyles.js
// Estilos de AnalyticsScreen.js
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const createStyles = (isDark, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  // ✨ Header Premium
  content: {
    flex: 1,
  },
  // ✨ Secciones
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  // ✨ Métricas Grid Premium
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCardWrapper: {
    width: (width - 44) / 2,
  },
  metricCardGradient: {
    borderRadius: 24,
    padding: 18,
    minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  metricIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  metricSubvalue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    fontWeight: '500',
  },
  // ✨ Rating Distribution Premium
  ratingContainer: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  ratingTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  ratingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  ratingStarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 45,
    gap: 4,
  },
  ratingStarNum: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  ratingCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 30,
    textAlign: 'right',
  },
  // ✨ Task Status Premium
  statusContainer: {
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statusTitleText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  statusItem: {
    marginBottom: 18,
  },
  statusItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusItemLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBarBg: {
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 7,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: 10,
  },
  // ✨ Top Tasks Premium
  topTasksContainer: {
    backgroundColor: theme.glass,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.glassBorder,
  },
  topTasksHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  topTasksHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topTasksIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topTasksTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
  },
  topTasksSubtitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  topTaskItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  topTaskRank: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  topTaskRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topTaskInfo: {
    flex: 1,
  },
  topTaskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  topTaskMeta: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  topTaskRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 24,
  },
  topTaskRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.accentLight,
  },
  // Loading
});
