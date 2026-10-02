// components/DialogHost.js
// Muestra los diálogos de la app (confirmaciones y avisos) con su propio diseño.
// Se monta una sola vez en App.js; los diálogos se piden con utils/alert.js.
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { registerDialogHost } from '../utils/alert';

export default function DialogHost() {
  const { theme, isDark } = useTheme();
  // Cola: si se piden dos diálogos seguidos, el segundo aparece al cerrar el primero
  const [queue, setQueue] = useState([]);
  const scale = useRef(new Animated.Value(0.92)).current;
  const dialog = queue[0] || null;

  useEffect(() => {
    registerDialogHost((next) => setQueue(current => [...current, next]));
    return () => registerDialogHost(null);
  }, []);

  useEffect(() => {
    if (!dialog) return;
    scale.setValue(0.92);
    Animated.spring(scale, { toValue: 1, tension: 110, friction: 10, useNativeDriver: true }).start();
  }, [dialog, scale]);

  const close = useCallback((button) => {
    setQueue(current => current.slice(1));
    // La acción se ejecuta después de cerrar, para que pueda abrir otro diálogo
    if (button?.onPress) setTimeout(button.onPress, 0);
  }, []);

  if (!dialog) return null;

  const { title, message, buttons } = dialog;
  const cancelButton = buttons.find(b => b.style === 'cancel');
  const isDestructive = buttons.some(b => b.style === 'destructive');
  const isQuestion = buttons.length > 1;
  const accent = isDestructive ? theme.error : theme.primary;
  const iconName = isDestructive ? 'alert-circle' : isQuestion ? 'help-circle' : 'information-circle';
  // Tocar fuera equivale a "Cancelar"; si el aviso tiene un solo botón, a ese botón
  const dismiss = () => close(cancelButton || (buttons.length === 1 ? buttons[0] : null));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={dismiss} accessibilityLabel="Cerrar" />

        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale }],
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}
          accessibilityRole="alert"
        >
          <View style={[styles.iconCircle, { backgroundColor: accent + '1F' }]}>
            <Ionicons name={iconName} size={30} color={accent} />
          </View>

          {!!title && <Text style={[styles.title, { color: theme.text }]}>{title}</Text>}
          {!!message && <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>}

          <View style={[styles.buttons, buttons.length > 2 && styles.buttonsColumn]}>
            {buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isPrimary = !isCancel && (buttons.length === 1 || button.style === 'destructive' || index === buttons.length - 1);
              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  onPress={() => close(button)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  style={[
                    styles.button,
                    buttons.length > 2 && styles.buttonFull,
                    isPrimary
                      ? { backgroundColor: button.style === 'destructive' ? theme.error : theme.primary }
                      : { borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: isPrimary ? '#FFFFFF' : (isDark ? 'rgba(255,255,255,0.75)' : '#555555') },
                      isPrimary && { fontWeight: '700' },
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 26,
  },
  buttonsColumn: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  buttonFull: {
    flex: 0,
    width: '100%',
  },
  buttonText: {
    fontSize: 15,
  },
});
