// components/QuickActionButton.js
// Botón de acción rápida flotante con animación de apertura
// Útil para FABs con múltiples opciones

import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

export default function QuickActionButton({
  actions = [], // [{ icon, label, onPress, color }]
  mainIcon = 'add',
  mainColor = null,
  position = 'bottom-right', // bottom-right, bottom-left, bottom-center
  size = 56,
}) {
  const { theme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Animaciones para cada acción
  const actionAnims = useRef(
    actions.map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  const primaryColor = mainColor || theme.primary;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    // Animar botón principal
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: isOpen ? 1 : 0.9,
        tension: 200,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // Animar acciones con delay escalonado
    actionAnims.forEach((anim, index) => {
      const delay = isOpen ? (actions.length - index - 1) * 50 : index * 50;
      
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(anim.translateY, {
            toValue: isOpen ? 0 : -(index + 1) * (size + 12),
            tension: 300,
            friction: 12,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: isOpen ? 0 : 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: isOpen ? 0.5 : 1,
            tension: 300,
            friction: 15,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);
    });

    setIsOpen(!isOpen);
  };

  const handleActionPress = (action) => {
    toggleMenu();
    setTimeout(() => {
      action.onPress?.();
    }, 150);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const getPositionStyle = () => {
    switch (position) {
      case 'bottom-left':
        return { left: 20, bottom: 20 };
      case 'bottom-center':
        return { alignSelf: 'center', bottom: 20 };
      default:
        return { right: 20, bottom: 20 };
    }
  };

  const actionButtonSize = size * 0.78;

  return (
    <View style={[styles.container, getPositionStyle()]}>
      {/* Overlay cuando está abierto */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
        />
      )}

      {/* Acciones secundarias */}
      {actions.map((action, index) => (
        <Animated.View
          key={index}
          style={[
            styles.actionButton,
            {
              width: actionButtonSize,
              height: actionButtonSize,
              borderRadius: actionButtonSize / 2,
              backgroundColor: action.color || theme.cardBackground,
              transform: [
                { translateY: actionAnims[index].translateY },
                { scale: actionAnims[index].scale },
              ],
              opacity: actionAnims[index].opacity,
              shadowColor: action.color || '#000',
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => handleActionPress(action)}
            style={styles.actionTouchable}
            activeOpacity={0.8}
          >
            <Ionicons
              name={action.icon}
              size={actionButtonSize * 0.4}
              color={action.iconColor || (action.color ? '#FFFFFF' : theme.textSecondary)}
            />
          </TouchableOpacity>
          {action.label && (
            <Animated.View
              style={[
                styles.labelContainer,
                {
                  opacity: actionAnims[index].opacity,
                  backgroundColor: isDark ? '#374151' : '#FFFFFF',
                },
              ]}
            >
              <Text style={[styles.label, { color: theme.text }]}>
                {action.label}
              </Text>
            </Animated.View>
          )}
        </Animated.View>
      ))}

      {/* Botón principal */}
      <Animated.View
        style={[
          styles.mainButton,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate }, { scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity onPress={toggleMenu} activeOpacity={0.9} style={styles.mainTouchable}>
          <LinearGradient
            colors={[primaryColor, `${primaryColor}DD`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: size / 2 }]}
          >
            <Ionicons name={mainIcon} size={size * 0.45} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    zIndex: -1,
  },
  mainButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainTouchable: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    position: 'absolute',
    bottom: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  labelContainer: {
    position: 'absolute',
    right: 60,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
});
