import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

/**
 * EmptyState component - Shows a friendly message when no data is available
 * ✨ Mejorado con animaciones fluidas, tips contextuales y CTAs
 * ⚡ Optimizado con React.memo y reducción de animaciones loop
 * 
 * @param {string} icon - Ionicons icon name
 * @param {string} title - Main heading text
 * @param {string} message - Descriptive message
 * @param {React.ReactNode} action - Optional action button/component
 * @param {Array<{icon: string, text: string}>} suggestions - Tips/sugerencias
 * @param {Object} quickAction - {label: string, icon: string, onPress: function}
 */
const EmptyState = memo(function EmptyState({ 
  icon = 'document-text-outline', 
  title = 'Sin tareas', 
  message = 'No hay tareas disponibles en este momento',
  action = null,
  variant = 'default', // default, success, info, warning
  suggestions = null, // Array de {icon, text}
  quickAction = null, // {label, icon, onPress}
  compact = false, // Modo compacto para listas
}) {
  const { theme, isDark } = useTheme();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // ✨ Entrada rápida con spring
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();

    // 🌊 Animación flotante suave - OPTIMIZADO: ejecutar solo una vez en lugar de loop
    Animated.sequence([
      Animated.timing(floatAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(floatAnim, {
        toValue: 0,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // 💫 Pulso suave del círculo de fondo - OPTIMIZADO: ejecutar solo una vez
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, floatAnim, pulseAnim, scaleAnim, slideAnim]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          bgColor: theme.statusClosedBg || 'rgba(16, 185, 129, 0.1)',
          iconColor: theme.statusClosed || '#10B981',
          pulseColor: 'rgba(16, 185, 129, 0.3)',
        };
      case 'info':
        return {
          bgColor: theme.infoAlpha || 'rgba(59, 130, 246, 0.1)',
          iconColor: theme.info || '#3B82F6',
          pulseColor: 'rgba(59, 130, 246, 0.3)',
        };
      case 'warning':
        return {
          bgColor: theme.statusPendingBg || 'rgba(245, 158, 11, 0.1)',
          iconColor: theme.statusPending || '#F59E0B',
          pulseColor: 'rgba(245, 158, 11, 0.3)',
        };
      default:
        return {
          bgColor: isDark ? 'rgba(255, 107, 157, 0.1)' : 'rgba(159, 34, 65, 0.08)',
          iconColor: theme.textSecondary,
          pulseColor: isDark ? 'rgba(255, 107, 157, 0.2)' : 'rgba(159, 34, 65, 0.15)',
        };
    }
  };

  const variantStyles = getVariantStyles();

  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <Animated.View style={[
      styles.container, 
      compact && styles.containerCompact,
      { 
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }
    ]}>
      {/* 🎨 Capa de pulso expansivo de fondo */}
      {!compact && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 160,
            height: 160,
            borderRadius: 80,
            backgroundColor: variantStyles.pulseColor,
            transform: [{ scale: pulseAnim }],
            opacity: 0.5,
          }}
        />
      )}

      {/* ✨ Contenedor del ícono con animaciones */}
      <Animated.View
        style={[
          styles.iconContainer,
          compact && styles.iconContainerCompact,
          {
            backgroundColor: variantStyles.bgColor,
            transform: [
              { translateY: compact ? 0 : floatY },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <Ionicons name={icon} size={compact ? 48 : 72} color={variantStyles.iconColor} />
      </Animated.View>
      
      {/* 📝 Texto principal */}
      <Text style={[styles.title, compact && styles.titleCompact, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.message, compact && styles.messageCompact, { color: theme.textSecondary }]}>{message}</Text>
      
      {/* 💡 Sugerencias/Tips */}
      {suggestions && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {suggestions.map((suggestion, index) => (
            <View key={index} style={styles.suggestionRow}>
              <Ionicons name={suggestion.icon || 'bulb-outline'} size={16} color={theme.primary} />
              <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>
                {suggestion.text}
              </Text>
            </View>
          ))}
        </View>
      )}
      
      {/* 🚀 Quick Action Button */}
      {quickAction && (
        <TouchableOpacity 
          style={[styles.quickActionButton, { backgroundColor: theme.primary }]}
          onPress={quickAction.onPress}
          activeOpacity={0.8}
        >
          {quickAction.icon && (
            <Ionicons name={quickAction.icon} size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          )}
          <Text style={styles.quickActionText}>{quickAction.label}</Text>
        </TouchableOpacity>
      )}
      
      {action && <View style={styles.actionContainer}>{action}</View>}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  containerCompact: {
    flex: 0,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainerCompact: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 17,
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  messageCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionsContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    maxWidth: 320,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionText: {
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    minWidth: 180,
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 24,
  },
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
