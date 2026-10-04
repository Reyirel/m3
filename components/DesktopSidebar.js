/**
 * DesktopSidebar.js
 * Barra lateral de navegación para tablet y escritorio (ancho ≥ 768px)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { roleLabel as getRoleLabel } from '../services/permissions';
import { confirmAlert } from '../utils/alert';
import { subscribeToUnreadCount } from '../services/notificationsLive';

export const SIDEBAR_WIDTH = 220;

const ROUTE_META = {
  Home:                { icon: 'home',          iconOff: 'home-outline',          label: 'Inicio'     },
  Kanban:              { icon: 'apps',           iconOff: 'apps-outline',           label: 'Tablero'    },
  Calendar:            { icon: 'calendar',       iconOff: 'calendar-outline',       label: 'Calendario' },
  Inbox:               { icon: 'file-tray-full', iconOff: 'file-tray-outline',      label: 'Bandeja'    },
  Reports:             { icon: 'bar-chart',      iconOff: 'bar-chart-outline',      label: 'Reportes'   },
  // Mismos nombres que en la pestaña "Más" del celular
  SecretarioDashboard: { icon: 'briefcase',      iconOff: 'briefcase-outline',      label: 'Panel de mi secretaría' },
  AreaChiefDashboard:  { icon: 'briefcase',      iconOff: 'briefcase-outline',      label: 'Panel de mi área' },
  ExecutiveDashboard:  { icon: 'speedometer',    iconOff: 'speedometer-outline',    label: 'Panel ejecutivo' },
  Admin:               { icon: 'people',         iconOff: 'people-outline',         label: 'Administración' },
};

export default function DesktopSidebar({
  routes,           // [{ name }] routes disponibles según rol
  activeRouteName,  // nombre de la ruta activa
  onNavigate,       // fn(routeName) para navegar entre tabs
  currentUser,
  overdueCount = 0,
  urgentCount = 0,
  onLogout,
  stackNavigation,  // navegación de Stack para Profile/Settings
}) {
  const { theme, isDark } = useTheme();
  const [hovered, setHovered] = useState(null);
  // Contador en tiempo real (lo alimenta NotificationWatcher en App.js)
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => subscribeToUnreadCount(setUnreadCount), []);

  const initials = (() => {
    const name = currentUser?.displayName || currentUser?.name || '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const roleLabel = getRoleLabel(currentUser?.role).toUpperCase();

  const confirmLogout = () => confirmAlert(
    'Cerrar sesión',
    '¿Quieres salir de tu cuenta en este dispositivo?',
    () => onLogout?.(),
    'Cerrar sesión'
  );

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

      {/* ─── Navegación principal ───
          Desplazable: en ventanas bajas las últimas opciones (Dashboard, Admin)
          quedaban recortadas y no había forma de llegar a ellas. */}
      <ScrollView style={styles.navScroll} contentContainerStyle={styles.nav} showsVerticalScrollIndicator={false}>
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
              // `stack`: pantalla que se abre encima de las pestañas, no una pestaña
              onPress={() => (route.stack ? stackNavigation?.navigate(route.name) : onNavigate(route.name))}
              style={[
                styles.navItem,
                isActive && { backgroundColor: theme.primaryAlpha },
                hovered === route.name && !isActive && {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                },
              ]}
              activeOpacity={0.75}
              accessibilityRole="link"
              accessibilityLabel={badge > 0 ? `${meta.label}, ${badge} pendientes` : meta.label}
              accessibilityState={{ selected: isActive }}
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
                  backgroundColor: route.name === 'Inbox' ? theme.error : theme.warningSolid,
                }]}>
                  <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── Acciones del fondo ─── */}
      <View style={[styles.bottom, {
        borderTopColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
      }]}>
        {[
          { key: 'notifications', label: 'Notificaciones', icon: 'notifications-outline', screen: 'Notifications', badge: unreadCount },
          { key: 'search', label: 'Buscar tareas', icon: 'search-outline', screen: 'Search' },
          currentUser?.role === 'admin' && { key: 'trash', label: 'Papelera', icon: 'trash-outline', screen: 'Trash' },
          { key: 'settings', label: 'Configuración', icon: 'settings-outline', screen: 'Settings' },
          { key: 'logout', label: 'Cerrar sesión', icon: 'log-out-outline', onPress: confirmLogout },
        ].filter(Boolean).map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={item.onPress || (() => stackNavigation?.navigate(item.screen))}
            accessibilityRole="button"
            accessibilityLabel={item.badge > 0 ? `${item.label}, ${item.badge} sin leer` : item.label}
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
            {item.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.error }]}>
                <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
              </View>
            )}
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
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 1,
  },
  navScroll: {
    flex: 1,
  },
  nav: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 2,
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
    fontSize: 14,
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
    fontSize: 12,
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
