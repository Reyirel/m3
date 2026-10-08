// components/ReportFormModalStyles.js
// Estilos de ReportFormModal.js
import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const createStyles = (isDark, theme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  background: {
    flex: 1,
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    flexDirection: 'column',
    display: 'flex',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  offlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.warningAlpha,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  offlineWarningText: {
    flex: 1,
    fontSize: 12,
    color: theme.warning,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
    backgroundColor: isDark ? theme.glass : theme.glassStrong,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  star: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? theme.glass : theme.glassStrong,
  },
  starActive: {
    backgroundColor: '#FFD700',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: (width - 56) / 2,
    height: (width - 56) / 2,
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    padding: 4,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  successBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 50,
    padding: 8,
  },
  errorBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 50,
    padding: 8,
  },
  uploadSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? theme.glass : theme.glassStrong,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  uploadSummaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addImageButton: {
    width: (width - 72) / 3,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? theme.glass : theme.glassStrong,
  },
  addImageText: {
    fontSize: 12,
    color: theme.primary,
    marginTop: 8,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  errorText: {
    color: theme.error,
    fontSize: 12,
    marginTop: 4,
  },
  ratingCommentInput: {
    minHeight: 80,
    marginTop: 8,
  },
  // 📋 Estilos de plantillas rápidas
  templatesSection: {
    marginBottom: 20,
  },
  templatesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  templatesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  templatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: isDark ? theme.glass : theme.glassStrong,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  templateIcon: {
    fontSize: 16,
  },
  templateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
});
