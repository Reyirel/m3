/**
 * GlassmorphicModal.js
 * Componente modal elegante con glasmorphism
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  SafeAreaView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

const GlassmorphicModal = ({
  visible = false,
  onClose,
  title,
  subtitle,
  icon,
  children,
  actions = [], // [{ label, onPress, variant: 'primary'|'secondary'|'destructive' }, ...]
  size = 'medium', // 'small', 'medium', 'large'
  animationType = 'fade',
}) => {
  const { theme, isDark } = useTheme();

  const styles = useMemo(
    () => createStyles(theme, isDark, size),
    [theme, isDark, size]
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType={animationType}
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.backdrop}
        onPress={onClose}
      >
        {/* Modal Content */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalCenter}
        >
          <View style={styles.modalContainer}>
            {Platform.OS === 'web' ? (
              <View style={styles.modalBackdrop} />
            ) : (
              <BlurView intensity={80} style={styles.modalBackdrop} />
            )}

            {/* Close Button */}
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.6}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>

            {/* Header */}
            {title && (
              <View style={styles.header}>
                {icon && (
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: theme.primaryAlpha },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={28}
                      color={theme.primary}
                    />
                  </View>
                )}
                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: theme.text }]}>
                    {title}
                  </Text>
                  {subtitle && (
                    <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                      {subtitle}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Body */}
            <View style={styles.body}>
              {typeof children === 'string' ? (
                <Text style={[styles.bodyText, { color: theme.text }]}>
                  {children}
                </Text>
              ) : (
                children
              )}
            </View>

            {/* Actions */}
            {actions.length > 0 && (
              <View style={styles.footer}>
                {actions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      action.onPress?.();
                      onClose();
                    }}
                    activeOpacity={0.6}
                    style={[
                      styles.action,
                      actions.length > 2 && styles.actionStacked,
                      {
                        backgroundColor: getActionBackgroundColor(
                          action.variant,
                          theme
                        ),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: getActionTextColor(action.variant, theme),
                        },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Highlight & Glow */}
            <View style={styles.highlight} />
            <View
              style={[
                styles.rimGlow,
                { borderColor: theme.glassBorder },
              ]}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const getActionBackgroundColor = (variant, theme) => {
  if (variant === 'destructive') return theme.errorAlpha;
  if (variant === 'secondary') return theme.primaryAlpha;
  return theme.primary;
};

const getActionTextColor = (variant, theme) => {
  if (variant === 'destructive') return theme.error;
  if (variant === 'secondary') return theme.primary;
  return '#fff';
};

const createStyles = (theme, isDark, size) => {
  const sizeConfig = {
    small: { width: 280, maxHeight: 400 },
    medium: { width: 340, maxHeight: 550 },
    large: { width: 400, maxHeight: 700 },
  };
  const config = sizeConfig[size] || sizeConfig.medium;

  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    modalContainer: {
      width: config.width,
      maxHeight: config.maxHeight,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: theme.cardBackground,
      position: 'relative',
    },
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 10,
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.primaryAlpha,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 12,
      gap: 12,
      alignItems: 'center',
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: {
      alignItems: 'center',
      gap: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 13,
      textAlign: 'center',
    },
    body: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    bodyText: {
      fontSize: 14,
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 8,
    },
    action: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionStacked: {
      flexDirection: 'row',
    },
    actionText: {
      fontSize: 15,
      fontWeight: '600',
    },
    highlight: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(255, 255, 255, 0.3)',
    },
    rimGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 1,
      borderRadius: 24,
      pointerEvents: 'none',
    },
  });
};

export default GlassmorphicModal;
