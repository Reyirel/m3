// screens/dashboard/AreaChiefDashboardStyles.js
// Estilos de AreaChiefDashboard.js
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  metricsSection: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  metricCard: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressCard: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  progressDetails: {
    fontSize: 12,
    fontWeight: '500',
  },
  reportsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  reportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportsButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  reportsButtonDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  tasksSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  tasksList: {
    gap: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusBar: {
    width: 5,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  assigneesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  assigneeAvatar: {
    marginRight: -8,
  },
  moreAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 20,
  },
});
