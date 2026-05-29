// components/BottomSheet.js
// Modal deslizable desde abajo con drag gesture
import React, { useRef, useEffect, useCallback } from 'react';
import { View, Modal, StyleSheet, Animated, PanResponder, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { hapticMedium } from '../utils/haptics';
import { useTheme } from '../contexts/ThemeContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const BottomSheet = ({
  visible = false,
  onClose,
  children,
  height = SCREEN_HEIGHT * 0.6,
  closeOnBackdrop = true,
}) => {
  const { theme, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const show = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, backdropOpacity]);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: height,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  }, [height, translateY, backdropOpacity, onClose]);

  useEffect(() => {
    if (visible) {
      show();
    } else {
      hide();
    }
  }, [visible, show, hide]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > height * 0.3 || gestureState.vy > 0.5) {
          hapticMedium();
          hide();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={hide}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
              backgroundColor: theme.overlay,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={closeOnBackdrop ? hide : undefined}
          />
        </Animated.View>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              height,
              transform: [{ translateY }],
              backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.88)',
              borderTopColor: isDark ? theme.glassBorder : theme.glassBorderSubtle,
              shadowColor: theme.glassShadow,
            },
          ]}
          {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
        >
          {/* Blur layer — native only */}
          {Platform.OS !== 'web' && (
            <View style={[StyleSheet.absoluteFillObject, styles.blurLayer]}>
              <BlurView
                intensity={isDark ? 85 : 70}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
          {/* Web: CSS backdrop-filter */}
          {Platform.OS === 'web' && (
            <View
              style={[
                StyleSheet.absoluteFillObject,
                styles.blurLayer,
                {
                  backdropFilter: `blur(${isDark ? 20 : 16}px)`,
                  WebkitBackdropFilter: `blur(${isDark ? 20 : 16}px)`,
                },
              ]}
            />
          )}

          {/* Top highlight stripe — light reflection */}
          <View
            pointerEvents="none"
            style={[
              styles.sheetHighlight,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.70)' },
            ]}
          />

          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[
              styles.handle,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)' },
            ]} />
          </View>

          {/* Content */}
          <View style={styles.content}>
            {children}
          </View>

          {/* Rim glow */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.sheetRim,
              { borderColor: theme.glassBorderSubtle },
            ]}
          />
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
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
  },
  blurLayer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  sheetHighlight: {
    position: 'absolute',
    top: 0,
    left: 40,
    right: 40,
    height: 1,
    borderRadius: 1,
    zIndex: 3,
  },
  sheetRim: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    zIndex: 3,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 14,
    zIndex: 2,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    zIndex: 2,
  },
});

export default BottomSheet;
