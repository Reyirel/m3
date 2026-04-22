/**
 * GlassModal.js
 * Modal glassmorphic premium con animaciones suaves
 * Backdrop blur + inner glow + spring animations
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Dimensions, Modal, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const { height: screenHeight } = Dimensions.get('window');

export default function GlassModal({
  visible = false,
  onClose = null,
  onDismiss = null,
  children,
  title = null,
  closeButton = true,
  animationType = 'slide', // 'slide' | 'fade'
  backdropOpacity = true,
  backdropIntensity = 40,
}) {
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      if (animationType === 'slide') {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (animationType === 'slide') {
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: screenHeight,
            useNativeDriver: true,
            tension: 30,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      } else {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 0.9,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      }
    }
  }, [visible]);

  const handleBackdropPress = () => {
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <BlurView intensity={backdropIntensity} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isDark
                ? 'rgba(0, 0, 0, 0.3)'
                : 'rgba(0, 0, 0, 0.2)',
            },
          ]}
        />
      </Animated.View>

      {/* Modal Content */}
      <Animated.View
        style={[
          styles.centeredView,
          animationType === 'slide'
            ? { transform: [{ translateY: slideAnim }] }
            : {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
        ]}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />

        {/* Glass Card */}
        <View
          style={[
            styles.glassCard,
            {
              backgroundColor: isDark
                ? 'rgba(20, 24, 35, 0.8)'
                : 'rgba(255, 255, 255, 0.85)',
            },
          ]}
        >
          {/* Blur Effect */}
          <BlurView
            intensity={isDark ? 60 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />

          {/* Inner Rim Glow */}
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                borderWidth: 1.5,
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.5)',
                pointerEvents: 'none',
              },
            ]}
          />

          {/* Header with title and close button */}
          {(title || closeButton) && (
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                {title && (
                  <View style={styles.titleContainer}>
                    {typeof title === 'string' ? (
                      <Text style={[styles.title, { color: theme.text }]}>
                        {title}
                      </Text>
                    ) : (
                      title
                    )}
                  </View>
                )}
              </View>
              {closeButton && (
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeButton,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.05)',
                    },
                  ]}
                >
                  <Ionicons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Modal Body */}
          <View style={styles.body}>
            {children}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  glassCard: {
    width: '90%',
    maxHeight: screenHeight * 0.8,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    padding: 20,
  },
});

