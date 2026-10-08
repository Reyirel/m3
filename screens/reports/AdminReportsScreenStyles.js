// screens/reports/AdminReportsScreenStyles.js
// Estilos de AdminReportsScreen.js
import { StyleSheet } from 'react-native';

export const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
  },
  innerContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  groupByRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  groupByLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  groupByButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.border,
  },
  groupByButtonActive: {
    backgroundColor: theme.primary,
  },
  groupByText: {
    fontSize: 12,
    color: theme.text,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginTop: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  reportCard: {
    margin: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reportTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  reportDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reportMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  taskLabel: {
    fontSize: 12,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
  },
  imagesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  imagesCount: {
    fontSize: 12,
  },
  pendingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pendingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '500',
  },
  senderArea: {
    fontSize: 14,
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  taskLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
  },
  taskLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 8,
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1000,
    padding: 8,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ratePrompt: {
    marginBottom: 12,
  },
  dateDetail: {
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.error,
    backgroundColor: theme.errorAlpha,
  },
  deleteButtonText: {
    color: theme.error,
    fontSize: 16,
    fontWeight: '600',
  },
});
