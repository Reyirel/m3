// screens/task/TaskProgressScreenStyles.js
// Estilos de TaskProgressScreen.js
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4
  },
  completionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  spacer: {
    height: 16
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.02)'
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600'
  },
  assigneeProgressItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)'
  },
  assigneeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  assigneeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  assigneeAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16
  },
  assigneeEmail: {
    fontSize: 14,
    fontWeight: '600'
  },
  assigneeSubtext: {
    fontSize: 12
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  assigneeProgressBar: {
    marginTop: 8
  },
  emptyAssignees: {
    paddingVertical: 16,
    alignItems: 'center'
  },
  subtaskItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  subtasksList: {
    marginTop: 16,
    gap: 8,
  },
  subtaskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subtaskStatus: {
    marginRight: 4,
  },
  subtaskMainContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subtaskMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  subtaskDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  subtaskTimestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  progressBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderLeftWidth: 3,
    borderRadius: 10,
    marginTop: 12
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginLeft: -22
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4
  },
  activityTime: {
    fontSize: 12
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600'
  }
});
