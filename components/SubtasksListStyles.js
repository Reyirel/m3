// components/SubtasksListStyles.js
// Estilos de SubtasksList.js
import { StyleSheet } from 'react-native';

export const createStyles = (theme) => StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 16,
    paddingHorizontal: 16,
  },

  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  progressContainer: {
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.success,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.success,
    textAlign: 'right',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: theme.background,
    borderRadius: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.textTertiary,
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateHint: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },

  listContent: {
    marginBottom: 16,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: theme.background,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.borderLight,
  },

  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  uncheckedBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: theme.borderLight,
    borderRadius: 6,
  },

  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
  },
  subtaskTitleCompleted: {
    color: theme.textTertiary,
    textDecorationLine: 'line-through',
  },
  completedTime: {
    fontSize: 12,
    color: theme.success,
    marginTop: 4,
    fontWeight: '500',
  },

  subtaskActions: {
    paddingLeft: 8,
  },
  expandButton: {
    padding: 4,
  },

  expandedView: {
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 0,
    marginTop: -8,
    paddingLeft: 48,
  },

  descriptionSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 18,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Sección de asignado
  assignedSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryAlpha,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    alignSelf: 'flex-start',
  },
  assignedText: {
    fontSize: 12,
    color: theme.primary,
    fontWeight: '500',
  },

  metadataSection: {
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
    paddingTop: 8,
  },
  metadataItem: {
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 12,
    color: theme.textTertiary,
    textTransform: 'uppercase',
  },
  metadataValue: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: theme.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: theme.background,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Estilos del modal de delegación
  delegateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  delegateModalContent: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  delegateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  delegateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  selectedSubtaskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  selectedSubtaskTitle: {
    flex: 1,
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  delegateModalSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 12,
  },
  delegateUsersList: {
    maxHeight: 300,
  },
  noDelegateUsers: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDelegateUsersText: {
    marginTop: 8,
    fontSize: 14,
    color: theme.textTertiary,
  },
  delegateUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.background,
    borderRadius: 10,
    marginBottom: 8,
  },
  delegateUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  delegateUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  delegateUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  delegateUserArea: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  delegateCancelButton: {
    backgroundColor: theme.borderLight,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  delegateCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
});
