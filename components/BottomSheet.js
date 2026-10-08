// components/BottomSheet.js
// Hoja que sube desde abajo. Se cierra arrastrando la barra superior, tocando fuera
// o con "atrás" (Escape en web).
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, Modal, StyleSheet, Animated, PanResponder, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticLight } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../theme/tokens';
import { EASING, OVERLAY_COLOR, SPRING, spring, timing } from '../theme/motion';

const BottomSheet = ({
  visible = false,
  onClose,
  children,
  title,
  height: heightProp,
  closeOnBackdrop = true,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const height = Math.min(heightProp || screenHeight * 0.6, screenHeight * 0.9) + insets.bottom;

  // El Modal sigue montado mientras dura la animación de salida
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const animateOut = useCallback((after) => {
    Animated.parallel([
      timing(translateY, height, { easing: EASING.exit }),
      timing(backdropOpacity, 0, { easing: EASING.exit }),
    ]).start(() => after?.());
  }, [height, translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(height);
      Animated.parallel([
        spring(translateY, 0, SPRING.sheet),
        timing(backdropOpacity, 1),
      ]).start();
    } else if (mounted) {
      animateOut(() => setMounted(false));
    }
    // `mounted` y `height` no deben relanzar la animación
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Cierre pedido por el usuario: primero la animación, después se avisa al padre
  const dismiss = useCallback(() => {
    animateOut(() => onCloseRef.current?.());
  }, [animateOut]);

  useEffect(() => {
    if (!mounted || Platform.OS !== 'web') return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mounted, dismiss]);

  // Solo la barra superior arrastra la hoja: así el contenido puede desplazarse
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  const heightRef = useRef(height);
  heightRef.current = height;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > heightRef.current * 0.3 || gesture.vy > 0.5) {
          hapticLight();
          dismissRef.current();
        } else {
          spring(translateY, 0, SPRING.sheet).start();
        }
      },
    })
  ).current;

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity
            accessibilityLabel="Cerrar"
            accessibilityRole="button"
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={closeOnBackdrop ? dismiss : undefined}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              height,
              paddingBottom: insets.bottom,
              transform: [{ translateY }],
              backgroundColor: theme.card,
              borderColor: theme.glassBorder,
              shadowColor: theme.shadowColor,
            },
          ]}
        >
          <View style={styles.handleContainer} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />
            {!!title && (
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            )}
          </View>

          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: OVERLAY_COLOR,
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
    ...(Platform.OS === 'web' ? { cursor: 'grab' } : {}),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  title: {
    ...TYPOGRAPHY.h3,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default BottomSheet;
