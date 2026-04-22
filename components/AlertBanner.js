// components/AlertBanner.js
// Banner de alerta profesional con 4 variantes

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { responsiveSpacing } from '../utils/responsiveTypography';
import { useResponsive } from '../utils/responsive';

export default function AlertBanner({
  type = 'info',           // 'success' | 'warning' | 'error' | 'info'
  title = 'Alerta',
  message = '',
  icon = null,             // Custom icon name
  action = null,           // { label, onPress }
  onClose = null,
  onDelete = null,         // Delete callback
  animated = true,
  dismissible = true,
}) {
  const { theme, isDark } = useTheme();
  const { width } = useResponsive();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animated, slideAnim, scaleAnim]);

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: isDark ? theme.successAlpha : 'rgba(16,185,129,0.08)',
          borderColor: isDark ? theme.success + '70' : theme.success,
          iconColor: isDark ? theme.successLight : theme.success,
          titleColor: isDark ? theme.successLight : theme.successDark,
          messageColor: isDark ? theme.success : theme.successDark,
          iconName: icon || 'checkmark-circle',
        };
      case 'warning':
        return {
          backgroundColor: isDark ? theme.warningAlpha : 'rgba(245,158,11,0.08)',
          borderColor: isDark ? theme.warning + '70' : theme.warning,
          iconColor: isDark ? theme.warningLight : theme.warning,
          titleColor: isDark ? theme.warningLight : theme.warningDark,
          messageColor: isDark ? theme.warning : theme.warningDark,
          iconName: icon || 'alert-circle',
        };
      case 'error':
        return {
          backgroundColor: isDark ? theme.errorAlpha : 'rgba(239,68,68,0.08)',
          borderColor: isDark ? theme.error + '70' : theme.error,
          iconColor: isDark ? theme.errorLight : theme.error,
          titleColor: isDark ? theme.errorLight : theme.errorDark,
          messageColor: isDark ? theme.error : theme.errorDark,
          iconName: icon || 'close-circle',
        };
      case 'info':
      default:
        return {
          backgroundColor: isDark ? theme.infoAlpha : 'rgba(59,130,246,0.08)',
          borderColor: isDark ? theme.info + '70' : theme.info,
          iconColor: isDark ? theme.infoLight : theme.info,
          titleColor: isDark ? theme.infoLight : theme.infoDark,
          messageColor: isDark ? theme.info : theme.infoDark,
          iconName: icon || 'information-circle',
        };
    }
  };

  const alertStyles = getAlertStyles();
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY },
            { scale: scaleAnim },
          ],
          marginHorizontal: responsiveSpacing.itemGap(width),
          marginVertical: responsiveSpacing.itemGap(width) / 2,
        },
      ]}
    >
      <View
        style={[
          styles.banner,
          {
            backgroundColor: alertStyles.backgroundColor,
            borderColor: alertStyles.borderColor,
            shadowColor: theme.glassShadow,
          },
        ]}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: alertStyles.iconColor + '22' },
          ]}
        >
          <Ionicons
            name={alertStyles.iconName}
            size={28}
            color={alertStyles.iconColor}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.title,
              { color: alertStyles.titleColor },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                styles.message,
                { color: alertStyles.messageColor },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          ) : null}
          {action ? (
            <TouchableOpacity onPress={action.onPress} style={styles.actionButton}>
              <Text
                style={[
                  styles.actionText,
                  { color: alertStyles.iconColor },
                ]}
              >
                {action.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={alertStyles.iconColor}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Close Button */}
        {dismissible && onClose && (
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={20}
              color={alertStyles.iconColor}
            />
          </TouchableOpacity>
        )}

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            style={styles.deleteButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={theme.error}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3.5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginRight: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  closeButton: {
    padding: 8,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
});
