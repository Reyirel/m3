/**
 * PremiumTabBar.js
 * Barra inferior del celular, con una píldora que se desliza a la pestaña activa.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { TYPOGRAPHY } from '../theme/tokens';
import { ACTIVE_OPACITY, SPRING, spring } from '../theme/motion';

const ROUTE_META = {
  Home:                 { label: 'Inicio',    icon: 'home',         iconOff: 'home-outline' },
  Kanban:               { label: 'Tablero',   icon: 'apps',         iconOff: 'apps-outline' },
  Calendar:             { label: 'Calendario',icon: 'calendar',     iconOff: 'calendar-outline' },
  Reports:              { label: 'Reportes',  icon: 'bar-chart',    iconOff: 'bar-chart-outline' },
  Inbox:                { label: 'Bandeja',   icon: 'file-tray-full', iconOff: 'file-tray-outline' },
  Admin:                { label: 'Admin',     icon: 'settings',     iconOff: 'settings-outline' },
  SecretarioDashboard:  { label: 'Panel',     icon: 'briefcase',    iconOff: 'briefcase-outline' },
  ExecutiveDashboard:   { label: 'Panel',     icon: 'speedometer',  iconOff: 'speedometer-outline' },
  More:                 { label: 'Más',       icon: 'ellipsis-horizontal-circle', iconOff: 'ellipsis-horizontal-circle-outline' },
};

// La barra muestra como máximo cinco pestañas. Las demás (reportes, paneles, admin)
// siguen registradas en el navegador, se abren desde "Más" y la dejan resaltada.
const PRIMARY_TABS = ['Home', 'Kanban', 'Calendar', 'Inbox', 'More'];

// Alto de la fila de pestañas, sin el margen seguro inferior
const BAR_HEIGHT = 60;
// Margen lateral de la fila de pestañas (debe coincidir con tabsContainer.paddingHorizontal)
const BAR_PADDING = 8;
// Espacio entre la píldora y los bordes de su pestaña
const PILL_INSET = 4;
const PILL_HEIGHT = 48;

export default function PremiumTabBar({ state, descriptors, navigation }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const hasMore = state.routes.some(route => route.name === 'More');
  const visibleRoutes = hasMore
    ? state.routes.filter(route => PRIMARY_TABS.includes(route.name))
    : state.routes;
  const focusedName = state.routes[state.index]?.name;
  const focusedVisibleIndex = visibleRoutes.findIndex(route => route.name === focusedName);
  const activeIndex = focusedVisibleIndex >= 0
    ? focusedVisibleIndex
    : Math.max(visibleRoutes.findIndex(route => route.name === 'More'), 0);
  // Ancho real de cada pestaña: la fila tiene margen lateral, así que no es pantalla / pestañas
  const tabWidth = (screenWidth - BAR_PADDING * 2) / visibleRoutes.length;
  const pillX = useRef(new Animated.Value(activeIndex * tabWidth)).current;

  useEffect(() => {
    spring(pillX, activeIndex * tabWidth, SPRING.sheet).start();
  }, [activeIndex, tabWidth, pillX]);

  // iOS: desenfoque real con un velo ligero. Android y web: superficie casi opaca
  // (el desenfoque de Android no es fiable y en web lo hace backdrop-filter).
  const useBlur = Platform.OS === 'ios';
  const surface = useBlur
    ? (isDark ? 'rgba(0,0,0,0.55)' : 'rgba(242,242,247,0.60)')
    : (isDark ? 'rgba(18,18,20,0.94)' : 'rgba(250,250,252,0.94)');
  const webGlass = Platform.OS === 'web'
    ? { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' }
    : null;
  const inactiveColor = theme.textSecondary;

  return (
    <View
      style={[
        styles.container,
        {
          height: BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopColor: theme.glassBorder,
          backgroundColor: surface,
        },
        webGlass,
      ]}
    >
      {useBlur && (
        <BlurView
          intensity={60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Píldora de la pestaña activa */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            width: tabWidth - PILL_INSET * 2,
            left: BAR_PADDING + PILL_INSET,
            backgroundColor: theme.primary,
            transform: [{ translateX: pillX }],
          },
        ]}
      />

      <View style={styles.tabsContainer} accessibilityRole="tablist">
        {visibleRoutes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = activeIndex === index;
          const meta = ROUTE_META[route.name] || { label: route.name, icon: 'ellipse', iconOff: 'ellipse-outline' };
          const badge = options.tabBarBadge;
          const color = isFocused ? theme.buttonPrimaryText : inactiveColor;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            // "Más" resaltada con otra pantalla abierta: tocarla vuelve al menú
            if (route.name !== focusedName && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={ACTIVE_OPACITY}
              accessibilityRole="tab"
              accessibilityLabel={typeof badge === 'number' && badge > 0 ? `${meta.label}, ${badge} pendientes` : meta.label}
              accessibilityState={{ selected: isFocused }}
            >
              <View style={styles.tabContent}>
                {badge != null && (
                  <View style={[styles.badge, { backgroundColor: theme.error }, options.tabBarBadgeStyle]}>
                    {typeof badge === 'number' && badge > 0 && (
                      <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                    )}
                  </View>
                )}

                <Ionicons name={isFocused ? meta.icon : meta.iconOff} size={22} color={color} />

                <Text
                  style={[styles.tabLabel, { color, fontWeight: isFocused ? '700' : '500' }]}
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
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tabsContainer: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    // Por encima de la píldora: en web cada View crea su propia capa
    zIndex: 2,
    paddingHorizontal: BAR_PADDING,
  },
  tab: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    height: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  tabContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  tabLabel: {
    ...TYPOGRAPHY.overline,
    letterSpacing: 0.1,
  },
  pill: {
    position: 'absolute',
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    zIndex: 1,
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
    zIndex: 3,
    paddingHorizontal: 3,
  },
  badgeText: {
    ...TYPOGRAPHY.overline,
    letterSpacing: 0,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
