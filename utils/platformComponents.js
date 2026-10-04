// utils/platformComponents.js
// Wrappers para componentes que tienen problemas en web
import { Platform } from 'react-native';

// GestureHandlerRootView compatible con web
export const getGestureHandlerRootView = () => {
  if (Platform.OS === 'web') {
    // En web, simplemente usar View normal
    const { View } = require('react-native');
    return View;
  }
  // En móvil, usar el componente real
  const { GestureHandlerRootView } = require('react-native-gesture-handler');
  return GestureHandlerRootView;
};

// Swipeable compatible con web
export const getSwipeable = () => {
  if (Platform.OS === 'web') {
    // En web, retornar un componente que renderiza children sin swipe
    const React = require('react');
    const { View } = require('react-native');
    return React.forwardRef((props, ref) => (
      <View ref={ref}>{props.children}</View>
    ));
  }
  const { Swipeable } = require('react-native-gesture-handler');
  return Swipeable;
};

// Confetti compatible con web
export const getConfettiCannon = () => {
  if (Platform.OS === 'web') {
    // En web, retornar un componente vacío
    const React = require('react');
    return () => null;
  }
  const ConfettiCannon = require('react-native-confetti-cannon').default;
  return ConfettiCannon;
};

export const isWeb = Platform.OS === 'web';
