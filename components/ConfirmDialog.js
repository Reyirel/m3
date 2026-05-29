// components/ConfirmDialog.js
// Diálogo de confirmación personalizado elegante
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { GlassView } from '../utils/GlassView';

export default function ConfirmDialog({
  visible,
  title = 'Confirmar',
  message = '¿Estás seguro?',
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  icon = 'help-circle',
  iconColor = '#FF9500',
  danger = false,
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const isDangerousDialog = isDangerous || danger;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }).start(() => scaleAnim.setValue(0.9));
    }
  }, [visible, scaleAnim]);

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm && onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel && onCancel();
    }
  };

  const confirmBg = isDangerousDialog ? theme.error : theme.primary;
  const confirmShadow = isDangerousDialog ? theme.error : theme.primary;
  const accentStart = isDangerousDialog ? theme.error : iconColor;
  const iconBg = isDangerousDialog
    ? theme.errorAlpha
    : iconColor + (isDark ? '25' : '18');
  const resolvedIconColor = isDangerousDialog ? theme.error : iconColor;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleCancel}
        />

        <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '85%', maxWidth: 400 }}>
          <GlassView
            intensity={isDark ? 60 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[
              styles.dialog,
              {
                backgroundColor: isDark ? theme.glass : theme.glassStrong,
                borderColor: isDark ? theme.glassBorder : theme.glassBorderStrong,
                shadowColor: theme.glassShadow,
                ...(Platform.OS === 'web' ? { backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } : {}),
              }
            ]}
          >
            {/* Top highlight stripe — glass reflection */}
            <View
              pointerEvents="none"
              style={[
                styles.dialogHighlight,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.72)' },
              ]}
            />

            {/* Top accent strip */}
            <LinearGradient
              colors={[accentStart, accentStart + '00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentStrip}
            />

            {/* Icono */}
            <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
              <Ionicons
                name={icon}
                size={48}
                color={resolvedIconColor}
              />
            </View>

            {/* Título */}
            <Text style={[styles.title, { color: theme.text }]}>
              {title}
            </Text>

            {/* Mensaje */}
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {message}
            </Text>

            {/* Rim glow */}
            <View
              pointerEvents="none"
              style={[
                styles.dialogRim,
                { borderColor: theme.glassBorderSubtle },
              ]}
            />

            {/* Botones */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, {
                  backgroundColor: isDark ? theme.glass : theme.glassLight,
                  borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle,
                  opacity: isLoading ? 0.5 : 1,
                }]}
                onPress={handleCancel}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton, {
                  backgroundColor: confirmBg,
                  shadowColor: confirmShadow,
                  opacity: isLoading ? 0.8 : 1,
                }]}
                onPress={handleConfirm}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.buttonText, styles.confirmButtonText]}>
                    {confirmText}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </GlassView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dialog: {
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 24,
    overflow: 'hidden',
  },
  dialogHighlight: {
    position: 'absolute',
    top: 0,
    left: 28,
    right: 28,
    height: 1,
    borderRadius: 1,
    zIndex: 2,
    pointerEvents: 'none',
  },
  dialogRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
    zIndex: 2,
    pointerEvents: 'none',
  },
  accentStrip: {
    height: 3,
    width: '100%',
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cancelButton: {
    borderColor: 'transparent',
  },
  confirmButton: {
    borderWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
});
