/**
 * GlassmorphicSection.js - Sección contenedora con glassmorphism
 * 
 * Agrupa contenido con título, descripción y efectos visuales
 * Soporte para collapsible, badge, y diferentes intensidades
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { PremiumGlassCard } from '../index';

const GlassmorphicSection = ({
  title,
  subtitle,
  icon,
  badge,
  badgeColor,
  collapsible = false,
  defaultExpanded = true,
  intensity = 'medium',
  glowEffect = false,
  glowColor,
  padding = 16,
  children,
  onToggle,
  style,
}) => {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const rotateAnim = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setIsExpanded(!isExpanded);
    onToggle && onToggle(!isExpanded);

    Animated.spring(rotateAnim, {
      toValue: isExpanded ? 0 : 1,
      tension: 60,
      friction: 9,
      useNativeDriver: true,
    }).start();
  };

  const rotateInterpolation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <PremiumGlassCard
      intensity={intensity}
      glowEffect={glowEffect}
      glowColor={glowColor}
      pressable={false}
      padding={padding}
      borderRadius={16}
      style={[
        styles.container,
        style,
      ]}
    >
      {/* HEADER */}
      {title && (
        <TouchableOpacity
          onPress={handleToggle}
          disabled={!collapsible}
          activeOpacity={collapsible ? 0.6 : 1}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            {icon && (
              <Ionicons
                name={icon}
                size={20}
                color={glowEffect ? glowColor : theme.primary}
                style={styles.icon}
              />
            )}
            <View style={styles.titleContainer}>
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

          <View style={styles.headerRight}>
            {badge && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: badgeColor || theme.primary },
                ]}
              >
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
            {collapsible && (
              <Animated.View
                style={{
                  transform: [{ rotate: rotateInterpolation }],
                }}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={theme.textMuted}
                />
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* DIVIDER */}
      {title && (isExpanded || !collapsible) && (
        <View
          style={[
            styles.divider,
            { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
          ]}
        />
      )}

      {/* CONTENT */}
      {(isExpanded || !collapsible) && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </PremiumGlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 12,
    borderBottomWidth: 1,
  },
  content: {
    gap: 12,
  },
});

export default GlassmorphicSection;
