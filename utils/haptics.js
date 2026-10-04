// utils/haptics.js
// Centralizador de haptic feedback con soporte web
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isWeb = Platform.OS === 'web';

export const hapticLight = () => {
  if (isWeb) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    // Haptic no disponible
  }
};

export const hapticMedium = () => {
  if (isWeb) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    // Haptic no disponible
  }
};

export const hapticHeavy = () => {
  if (isWeb) return;
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (e) {
    // Haptic no disponible
  }
};

export const hapticSuccess = () => {
  if (isWeb) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    // Haptic no disponible
  }
};

export const hapticWarning = () => {
  if (isWeb) return;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (e) {
    // Haptic no disponible
  }
};

