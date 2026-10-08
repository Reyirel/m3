// components/AppToast.js
// Avisos breves (react-native-toast-message) con el diseño y el tema de la app.
// App.js monta <AppToast /> una sola vez; los avisos se piden con useNotification().
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useResponsive } from '../utils/responsive';
import { RADIUS, SPACING, TYPOGRAPHY, MAX_WIDTHS } from '../theme/tokens';

// Alto de la barra inferior del celular: los avisos de abajo se muestran por encima
const TAB_BAR_HEIGHT = 64;

const ICONS = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

function ToastCard({ type, text1, text2, onPress }) {
  const { theme } = useTheme();
  const color = {
    success: theme.success,
    error: theme.error,
    info: theme.info,
    warning: theme.warningText,
  }[type] || theme.info;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: theme.cardElevated, borderColor: theme.glassBorderStrong, shadowColor: theme.shadowColor }]}
      accessibilityRole="alert"
      accessibilityLabel={[text1, text2].filter(Boolean).join('. ')}
    >
      <Ionicons name={ICONS[type] || ICONS.info} size={22} color={color} />
      <View style={styles.text}>
        {!!text1 && <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{text1}</Text>}
        {!!text2 && <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={3}>{text2}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const toastConfig = {
  success: (props) => <ToastCard {...props} type="success" />,
  error: (props) => <ToastCard {...props} type="error" />,
  info: (props) => <ToastCard {...props} type="info" />,
  warning: (props) => <ToastCard {...props} type="warning" />,
};

export default function AppToast() {
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  return (
    <Toast
      config={toastConfig}
      topOffset={insets.top + SPACING.md}
      bottomOffset={insets.bottom + SPACING.lg + (isMobile ? TAB_BAR_HEIGHT : 0)}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '92%',
    maxWidth: MAX_WIDTHS.modal,
    minHeight: 52,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  text: { flex: 1 },
  title: { ...TYPOGRAPHY.bodySmall, fontWeight: '600' },
  message: { ...TYPOGRAPHY.caption, marginTop: 2 },
});
