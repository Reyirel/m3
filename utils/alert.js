import { Alert, Platform } from 'react-native';

/**
 * Muestra un diálogo de confirmación destructiva.
 * En web usa window.confirm (Alert.alert no dispara onPress en web).
 */
export function confirmAlert(title, message, onConfirm, confirmLabel = 'Confirmar') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Muestra un Alert informativo (sin callbacks — funciona bien en todas las plataformas).
 */
export function infoAlert(title, message) {
  Alert.alert(title, message);
}
