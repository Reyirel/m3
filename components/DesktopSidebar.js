/**
 * DesktopSidebar.js
 * Barra lateral de navegación para tablet y escritorio (ancho ≥ 768px)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export const SIDEBAR_WIDTH = 220;

const ROUTE_META = {
  Home:                { icon: 'home',          iconOff: 'home-outline',          label: 'Inicio'     },
  Kanban:              { icon: 'apps',           iconOff: 'apps-outline',           label: 'Tablero'    },
  Calendar:            { icon: 'calendar',       iconOff: 'calendar-outline',       label: 'Calendario' },
  Inbox:               { icon: 'file-tray-full', iconOff: 'file-tray-outline',      label: 'Bandeja'    },
  Reports:             { icon: 'bar-chart',      iconOff: 'bar-chart-outline',      label: 'Reportes'   },
  SecretarioDashboard: { icon: 'briefcase',      iconOff: 'briefcase-outline',      label: 'Panel'      },
  ExecutiveDashboard:  { icon: 'speedometer',    iconOff: 'speedometer-outline',    label: 'Dashboard'  },
  Admin:               { icon: 'settings',       iconOff: 'settings-outline',       label: 'Admin'      },
};

export default function DesktopSidebar({
  routes,           // [{ name }] routes disponibles según rol
  activeRouteName,  // nombre de la ruta activa
  onNavigate,       // fn(routeName) para navegar entre tabs
  currentUser,
  overdueCount = 0,
  urgentCount = 0,
  stackNavigation,  // navegación de Stack para Profile/Settings
}) {
  const { theme, isDark } = useTheme();
  const [hovered, setHovered] = useState(null);

  const initials = (() => {
    const name = currentUser?.displayName || currentUser?.name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const roleLabel = (() => {
    switch (currentUser?.role) {
      case 'admin': return 'ADMINISTRADOR';
      case 'secretario': return 'SECRETARIO';
      case 'director': return 'DIRECTOR';
      default: return 'USUARIO';
    }
  })();

  return (
    <View style={[styles.sidebar, {
      backgroundColor: isDark ? '#0C0A0F' : '#FFFFFF',
      borderRightColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    }]}>
      {/* ─── Brand / Usuario ─── */}
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.brand}
      >
        <TouchableOpacity
          style={styles.brandInner}
          onPress={() => stackNavigation?.navigate('Profile')}
          activeOpacity={0.75}
          accessibilityLabel="Ver perfil"
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials || 'U'}</Text>
          </View>
          <View style={styles.brandText}>
            <Text style={styles.brandName} numberOfLines={1}>
              {currentUser?.displayName || currentUser?.name || 'Usuario'}
            </Text>
            <Text style={styles.brandRole}>{roleLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── Navegación principal ─── */}
      <View style={styles.nav}>
        {routes.map((route) => {
          const meta = ROUTE_META[route.name];
          if (!meta) return null;
          const isActive = activeRouteName === route.name;
          const badge = route.name === 'Home' ? urgentCount
            : route.name === 'Inbox' ? overdueCount
            : 0;

          return (
            <TouchableOpacity
              key={route.name}
              onPress={() => onNavigate(route.name)}
              style={[
                styles.navItem,
                isActive && { backgroundColor: theme.primaryAlpha },
                hovered === route.name && !isActive && {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                },
              ]}
              activeOpacity={0.75}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => setHovered(route.name),
                onMouseLeave: () => setHovered(null),
              } : {})}
            >
              {isActive && (
                <View style={[styles.activePill, { backgroundColor: theme.primary }]} />
              )}
              <Ionicons
                name={isActive ? meta.icon : meta.iconOff}
                size={19}
                color={isActive ? theme.primary : theme.textSecondary}
              />
              <Text style={[styles.navLabel, {
                color: isActive ? theme.primary : theme.textSecondary,
                fontWeight: isActive ? '700' : '500',
              }]}>
                {meta.label}
              </Text>
              {badge > 0 && (
                <View style={[styles.badge, {
                  backgroundColor: route.name === 'Inbox' ? theme.error : theme.warning,
                }]}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ─── Acciones del fondo ─── */}
      <View style={[styles.bottom, {
        borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
      }]}>
        {[
          { key: 'settings', label: 'Configuración', icon: 'settings-outline', screen: 'Settings' },
          { key: 'notifications', label: 'Notificaciones', icon: 'notifications-outline', screen: 'Notifications' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => stackNavigation?.navigate(item.screen)}
            style={[
              styles.navItem,
              hovered === item.key && {
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              },
            ]}
            activeOpacity={0.75}
            {...(Platform.OS === 'web' ? {
              onMouseEnter: () => setHovered(item.key),
              onMouseLeave: () => setHovered(null),
            } : {})}
          >
            <Ionicons name={item.icon} size={18} color={theme.textSecondary} />
            <Text style={[styles.navLabel, { color: theme.textSecondary }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  brand: {
    paddingTop: Platform.OS === 'ios' ? 52 : 20,
    paddingBottom: 16,
    paddingHorizontal: 14,
  },
  brandInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandText: {
    flex: 1,
    gap: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  brandRole: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 1,
  },
  nav: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 12,
    gap: 2,
    overflow: 'hidden',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  activePill: {
    position: 'absolute',
    left: 3,
    top: 9,
    bottom: 9,
    width: 3,
    borderRadius: 2,
  },
  navLabel: {
    fontSize: 13,
    flex: 1,
    letterSpacing: -0.1,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottom: {
    paddingHorizontal: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 2,
  },
});
