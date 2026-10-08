// screens/task/TaskDetailScreenStyles.js
// Estilos de TaskDetailScreen.js
import { StyleSheet } from 'react-native';
import { MAX_WIDTHS } from '../../theme/tokens';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
    width: '100%',
    maxWidth: MAX_WIDTHS.narrow,
    alignSelf: 'center',
  },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fieldError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  fieldErrorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  titularesCard: {
    flexDirection: 'column',
    gap: 4,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  infoCardDesc: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 3,
  },
  titularRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  titularName: {
    fontSize: 14,
    fontWeight: '600',
  },
  titularMeta: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
});
