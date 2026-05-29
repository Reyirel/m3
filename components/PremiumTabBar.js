/**
 * PremiumTabBar.js
 * Tab bar premium flotante con pill-indicator animado y blur real
 * Glassmorfismo con animaciones suaves — web + mobile
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

const ROUTE_META = {
  Home:                 { label: 'Inicio',    icon: 'home',         iconOff: 'home-outline' },
  Kanban:               { label: 'Tablero',   icon: 'apps',         iconOff: 'apps-outline' },
  Calendar:             { label: 'Calendario',icon: 'calendar',     iconOff: 'calendar-outline' },
  Reports:              { label: 'Reportes',  icon: 'bar-chart',    iconOff: 'bar-chart-outline' },
  Inbox:                { label: 'Bandeja',   icon: 'file-tray-full', iconOff: 'file-tray-outline' },
  Admin:                { label: 'Admin',     icon: 'settings',     iconOff: 'settings-outline' },
  SecretarioDashboard:  { label: 'Panel',     icon: 'briefcase',    iconOff: 'briefcase-outline' },
};

export default function PremiumTabBar({ state, descriptors, navigation, isDark: isDarkProp, insets }) {
  const { theme, isDark: themeDark } = useTheme();
  const isDark = isDarkProp ?? themeDark;
  const { width: screenWidth } = useWindowDimensions();

  const isWide = screenWidth >= 768;
  const tabCount   = state.routes.length;
  const tabWidth   = screenWidth / tabCount;
  const pillPosition = useSharedValue(0);
  const pillScale    = useSharedValue(1);

  useEffect(() => {
    pillPosition.value = withSpring(state.index * tabWidth, {
      damping: 18,
      mass: 0.8,
      stiffness: 200,
      overshootClamping: false,
    });
    pillScale.value = withTiming(0.92, { duration: 80 }, () => {
      pillScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
  }, [state.index, tabWidth]);

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          pillPosition.value,
          [0, screenWidth],
          [0, screenWidth],
          'clamp',
        ),
      },
      { scale: pillScale.value },
    ],
  }));

  const webGlassStyle = Platform.OS === 'web' ? {
    backdropFilter: 'blur(40px) saturate(180%)',
    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
  } : {};

  return (
    <View
      style={[
        styles.container,
        {
          height: isWide ? 74 : Platform.OS === 'ios' ? 80 : 66,
          paddingBottom: Platform.OS === 'ios' ? (insets?.bottom ?? 0) + 4 : 4,
          borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backgroundColor: isDark ? 'rgba(0,0,0,0.88)' : 'rgba(242,242,247,0.92)',
          ...webGlassStyle,
        },
      ]}
    >
      {/* Blur background — native only */}
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={isDark ? 60 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Glass overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: isDark ? 'rgba(15,10,20,0.55)' : 'rgba(255,255,255,0.55)' },
        ]}
      />

      {/* Border superior luminoso */}
      <View
        style={[
          styles.topBorder,
          { backgroundColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.08)' },
        ]}
      />

      {/* Pill indicator animado */}
      <Animated.View
        style={[
          styles.pillIndicator,
          {
            width: tabWidth - 16,
            left: 8,
            height: isWide ? 56 : 48,
            backgroundColor: theme.primary,
            shadowColor: theme.primary,
          },
          pillAnimatedStyle,
        ]}
      >
        <View style={styles.pillGlow} />
      </Animated.View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const meta = ROUTE_META[route.name] || { label: route.name, icon: 'ellipse', iconOff: 'ellipse-outline' };
          const iconName = isFocused ? meta.icon : meta.iconOff;
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tab, { width: tabWidth }]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={meta.label}
              accessibilityState={{ selected: isFocused }}
            >
              <View style={styles.tabContent}>
                {/* Badge */}
                {badge != null && (
                  <View style={[styles.badge, { backgroundColor: theme.error }, options.tabBarBadgeStyle]}>
                    {typeof badge === 'number' && badge > 0 && (
                      <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                    )}
                  </View>
                )}

                <Ionicons
                  name={iconName}
                  size={isWide ? 24 : 22}
                  color={isFocused ? '#FFFFFF' : isDark ? theme.textMuted : theme.textSecondary}
                />

                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? '#FFFFFF' : isDark ? theme.textMuted : theme.textSecondary,
                      fontWeight: isFocused ? '700' : '500',
                      opacity: isFocused ? 1 : 0.7,
                      fontSize: isWide ? 12 : 10,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {meta.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'ios' ? 80 : 66,
    backgroundColor: 'transparent',
    flexDirection: 'column',
    borderTopWidth: 0.5,
    overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
  },
  topBorder: {
    height: 0.5,
    width: '100%',
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 4,
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    height: '100%',
    zIndex: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  tabContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
    marginTop: 1,
  },
  pillIndicator: {
    position: 'absolute',
    top: 4,
    height: 48,
    borderRadius: 24,
    zIndex: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  pillGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    zIndex: 3,
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
