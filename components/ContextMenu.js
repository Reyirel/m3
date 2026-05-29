// components/ContextMenu.js
// Menú contextual para long-press en TaskItem
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ContextMenu({
  visible,
  onClose,
  position = { x: 0, y: 0 },
  actions = []
}) {
  const { theme, isDark } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible, opacityAnim, scaleAnim]);

  if (!visible) return null;

  // Ajustar posición para que no se salga de la pantalla
  const menuWidth = 200;
  const adjustedX = Math.min(position.x, SCREEN_WIDTH - menuWidth - 20);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.menu,
            {
              top: position.y,
              left: adjustedX,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: isDark ? 'rgba(28, 17, 24, 0.82)' : 'rgba(255, 255, 255, 0.82)',
              borderColor: isDark ? theme.glassBorder : theme.glassBorderSubtle,
              shadowColor: theme.glassShadow,
            }
          ]}
        >
          {/* Blur layer — native */}
          {Platform.OS !== 'web' && (
            <View style={[StyleSheet.absoluteFillObject, styles.blurLayer]}>
              <BlurView
                intensity={isDark ? 80 : 65}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
            </View>
          )}
          {/* Blur layer — web */}
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
          {/* Top highlight stripe */}
          <View
            pointerEvents="none"
            style={[
              styles.menuHighlight,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.75)' },
            ]}
          />
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.menuItem,
                {
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                },
                index === actions.length - 1 && styles.lastMenuItem,
                action.danger && {
                  backgroundColor: theme.errorAlpha,
                },
              ]}
              onPress={() => {
                onClose();
                setTimeout(() => action.onPress(), 100);
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.actionIconBg,
                { backgroundColor: action.danger ? theme.errorAlpha : theme.infoAlpha }
              ]}>
                <Ionicons
                  name={action.icon}
                  size={18}
                  color={action.danger ? theme.error : theme.info}
                />
              </View>
              <Text
                style={[
                  styles.menuText,
                  { color: action.danger ? theme.error : theme.text },
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Rim glow */}
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.menuRim,
              { borderColor: theme.glassBorderSubtle },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menu: {
    position: 'absolute',
    borderRadius: 18,
    minWidth: 210,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.40,
    shadowRadius: 24,
    elevation: 18,
    overflow: 'hidden',
  },
  blurLayer: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  menuHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    borderRadius: 1,
    zIndex: 3,
  },
  menuRim: {
    borderRadius: 18,
    borderWidth: 1,
    zIndex: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  actionIconBg: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
});
