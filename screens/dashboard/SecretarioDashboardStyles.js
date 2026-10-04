// screens/dashboard/SecretarioDashboardStyles.js
// Estilos de SecretarioDashboardScreen
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 4,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    fontWeight: '500',
  },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  section: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: (width - 64 - 30) / 4,
    minWidth: 70,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  completionSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 14,
  },
  completionValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  coordinationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  coordinationInfo: {
    flex: 1,
  },
  coordinationValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  coordinationLabel: {
    fontSize: 13,
  },
  coordinationStats: {
    justifyContent: 'center',
    gap: 8,
  },
  coordinationStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordinationStatText: {
    fontSize: 13,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  directorCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  directorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  directorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  directorName: {
    fontSize: 15,
    fontWeight: '600',
  },
  directorArea: {
    fontSize: 12,
    marginTop: 2,
  },
  complianceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 8,
  },
  complianceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  directorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  directorActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  directorActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  taskStatusIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskRowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskRowArea: {
    fontSize: 12,
    marginTop: 2,
  },
  directorStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  directorStat: {
    alignItems: 'center',
  },
  directorStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  directorStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  // Estilos para Resumen del Área
  areaSummaryCard: {
    padding: 4,
  },
  areaSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  areaSummaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  areaSummaryValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
  },
  areaSummaryLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  areaSummaryProgress: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  areaSummaryProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  areaSummaryProgressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  areaSummaryProgressValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  directionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  directionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  directionName: {
    fontSize: 14,
    fontWeight: '600',
  },
  directionStats: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    width: (width - 64 - 12) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
