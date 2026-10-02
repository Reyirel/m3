import { Alert, Platform } from 'react-native';

/**
 * Diálogos de la app con el diseño propio (components/DialogHost.js).
 *
 * En web, Alert.alert de React Native no hace nada y window.confirm muestra la ventana
 * gris del navegador ("m3-beige.vercel.app dice…"). Por eso en web todos los diálogos
 * —los de este archivo y cualquier Alert.alert del resto del código— se muestran con
 * DialogHost. En iOS y Android se sigue usando el diálogo nativo del sistema.
 */

let dialogHost = null;
const nativeAlert = Alert.alert.bind(Alert);

/** DialogHost se registra aquí al montarse (y pasa null al desmontarse) */
export function registerDialogHost(host) {
  dialogHost = host;
}

/**
 * Mostrar un diálogo.
 * @param {Object} dialog
 * @param {string} dialog.title
 * @param {string} [dialog.message]
 * @param {Array<{text: string, style?: 'cancel'|'destructive'|'default', onPress?: Function}>} [dialog.buttons]
 */
export function showDialog({ title, message = '', buttons }) {
  const resolvedButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'Aceptar' }];

  if (Platform.OS !== 'web') {
    nativeAlert(title, message, resolvedButtons);
    return;
  }

  if (dialogHost) {
    dialogHost({ title, message, buttons: resolvedButtons });
    return;
  }

  // Sin DialogHost montado (no debería pasar): diálogo del navegador
  const text = [title, message].filter(Boolean).join('\n\n');
  const action = resolvedButtons.find(b => b.style !== 'cancel');
  if (resolvedButtons.length > 1) {
    if (window.confirm(text)) action?.onPress?.();
    else resolvedButtons.find(b => b.style === 'cancel')?.onPress?.();
  } else {
    window.alert(text);
    resolvedButtons[0]?.onPress?.();
  }
}

/**
 * Muestra un diálogo de confirmación destructiva.
 */
export function confirmAlert(title, message, onConfirm, confirmLabel = 'Confirmar') {
  showDialog({
    title,
    message,
    buttons: [
      { text: 'Cancelar', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ],
  });
}

/**
 * Muestra un aviso informativo con un solo botón.
 */
export function infoAlert(title, message) {
  showDialog({ title, message });
}

// En web, los Alert.alert que hay por todo el código pasan a mostrarse con el diseño
// de la app (antes no mostraban nada y sus botones nunca se ejecutaban).
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => showDialog({ title, message, buttons });
}
