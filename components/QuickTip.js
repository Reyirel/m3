// components/QuickTip.js
// Componente de tip rápido que aparece una sola vez
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  Dimensions,
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

Dimensions.get('window');

/**
 * QuickTip - Muestra un tip de ayuda una sola vez al usuario
 * Se guarda en AsyncStorage para no repetir
 * 
 * @param {string} tipId - ID único para este tip (ej: 'home_swipe_tip')
 * @param {string} title - Título del tip
 * @param {string} message - Mensaje explicativo
 * @param {string} icon - Icono Ionicons
 * @param {string} position - 'top' | 'bottom' | 'center'
 * @param {function} onDismiss - Callback cuando se cierra
 */
const QuickTip = ({
  tipId,
  title = 'Tip',
  message,
  icon = 'bulb-outline',
  position = 'bottom',
  onDismiss,
  delay = 1000, // Delay antes de mostrar
  showOnce = true, // Si se muestra solo una vez
}) => {
  const { theme, isDark } = useTheme();
  const [_visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    checkAndShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAndShow = async () => {
    try {
      if (showOnce) {
        const seen = await AsyncStorage.getItem(`@tip_${tipId}`);
        if (seen) {
          return; // Ya se mostró
        }
      }
      
      // Delay antes de mostrar
      setTimeout(() => {
        setShouldRender(true);
        setVisible(true);
        showTip();
      }, delay);
    } catch (error) {
      if (__DEV__) console.error('Error checking tip:', error);
    }
  };

  const showTip = () => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const dismissTip = async () => {
    // Animar salida
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: position === 'top' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setVisible(false);
      setShouldRender(false);
      
      // Guardar que ya se vio
      if (showOnce) {
        try {
          await AsyncStorage.setItem(`@tip_${tipId}`, 'seen');
        } catch (error) {
          if (__DEV__) console.error('Error saving tip state:', error);
        }
      }
      
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  if (!shouldRender) return null;

  const getPositionStyle = () => {
    switch (position) {
      case 'top':
        return { top: Platform.OS === 'ios' ? 100 : 80 };
      case 'center':
        return { top: '40%' };
      case 'bottom':
      default:
        return { bottom: Platform.OS === 'ios' ? 120 : 100 };
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        getPositionStyle(),
        {
          backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
          borderColor: theme.primary + '30',
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: fadeAnim,
          shadowColor: theme.primary,
        },
      ]}
    >
      {/* Ícono decorativo */}
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name={icon} size={24} color={theme.primary} />
      </View>

      {/* Contenido */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      </View>

      {/* Botón cerrar */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={dismissTip}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Indicador de tip */}
      <View style={[styles.tipIndicator, { backgroundColor: theme.primary }]} />
    </Animated.View>
  );
};

// Función helper para resetear todos los tips (útil para testing)
export const resetAllTips = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const tipKeys = keys.filter(k => k.startsWith('@tip_'));
    await AsyncStorage.multiRemove(tipKeys);
  } catch (error) {
    if (__DEV__) console.error('Error resetting tips:', error);
  }
};

// Tips predefinidos para usar en la app
export const TIPS = {
  HOME_SWIPE: {
    tipId: 'home_swipe_v2',
    title: 'Filtra tocando los chips',
    message: 'Los chips de colores (Pendientes, En proceso, Cerradas) filtran la lista al instante. El chip "Vencidas" te muestra cuántas atender.',
    icon: 'funnel',
  },
  HOME_CREATE: {
    tipId: 'home_create',
    title: 'Crea tu primera tarea',
    message: 'Toca el botón + (abajo a la derecha) para crear una tarea. La IA sugiere subtareas automáticamente según el título.',
    icon: 'add-circle',
  },
  KANBAN_DRAG: {
    tipId: 'kanban_drag',
    title: 'Cambia el estado fácilmente',
    message: 'Toca una tarea para ver sus detalles. Desde ahí puedes mover su estado entre Pendiente, En Proceso, Revisión y Cerrada.',
    icon: 'hand-left',
  },
  REPORTS_PHOTO: {
    tipId: 'reports_photo',
    title: 'Adjunta evidencia',
    message: 'Toca el ícono de cámara en un reporte para agregar fotos. Funciona sin internet — se sube sola al reconectarte.',
    icon: 'camera',
  },
  TASK_DATES: {
    tipId: 'task_dates_v2',
    title: 'Fechas en lenguaje natural',
    message: 'Las tarjetas muestran "Hoy", "Mañana" o "en 3d" para que sepas de un vistazo qué vence pronto sin leer fechas.',
    icon: 'calendar-outline',
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    maxWidth: 500,
    alignSelf: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
  tipIndicator: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 2,
  },
});

export default QuickTip;
