import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import GlassChip from './GlassChip';
import SearchBar from '../SearchBar';
import { subscribeToUnreadCount } from '../../services/notificationsLive';

const FILTERS = [
  { id: 'todas',       label: 'Todas',       icon: 'list'                          },
  { id: 'pendiente',   label: 'Pendiente',   icon: 'time-outline'                  },
  { id: 'en_proceso',  label: 'En proceso',  icon: 'play-circle-outline'           },
  { id: 'en_revision', label: 'Revisión',    icon: 'eye-outline'                   },
  { id: 'cerrada',     label: 'Completadas', icon: 'checkmark-done-circle-outline' },
];

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días,';
  if (h < 19) return 'Buenas tardes,';
  return 'Buenas noches,';
}

export default function HomeHeader({
  userName = 'Usuario',
  userEmail = '',
  role = 'USUARIO',
  onSearch,
  searchText = '',
  quickStatusFilter = 'todas',
  onFilterChange,
  statusCounts = {},
  onProfilePress,
  onNotificationsPress,
  searchRef,
}) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= 768;
  const [unreadCount, setUnreadCount] = useState(0);

  // Contador en tiempo real (lo alimenta NotificationWatcher en App.js)
  useEffect(() => subscribeToUnreadCount(setUnreadCount), []);

  const initials = getInitials(userName);

  return (
    <View>
      {/* ─── Gradient header ─── */}
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={[styles.gradient, isWide && styles.gradientWide]}
      >
        <View style={[styles.headerRow, isWide && { alignItems: 'center', flex: 1 }]}>
          {/* Avatar + info — navega a perfil */}
          <TouchableOpacity
            style={[styles.userBlock, isWide && styles.userBlockWide]}
            onPress={onProfilePress}
            activeOpacity={onProfilePress ? 0.75 : 1}
            accessibilityLabel="Ver perfil"
            accessibilityRole="button"
          >
            <View style={styles.avatarRow}>
              <View style={[styles.avatarCircle, isWide && { width: 40, height: 40, borderRadius: 20 }]}>
                <Text style={[styles.avatarText, isWide && { fontSize: 14 }]}>{initials}</Text>
              </View>
              <View style={[styles.userInfo, isWide && styles.userInfoWide]}>
                {!isWide && <Text style={styles.greeting}>{getGreeting()}</Text>}
                <Text style={[styles.name, isWide && { fontSize: 17, lineHeight: 22 }]} numberOfLines={1}>{userName}</Text>
                {isWide && <Text style={styles.greeting}>{role}</Text>}
              </View>
            </View>
            {!isWide && (
              <View style={styles.roleTag}>
                <Text style={styles.roleText}>{role}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Search inline en desktop */}
          {isWide && (
            <View style={[styles.searchCard, styles.searchCardWide, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.25)' }]}>
              <SearchBar ref={searchRef} onSearch={onSearch} placeholder="Buscar tareas..." initialValue={searchText} />
            </View>
          )}

          {/* Botones del lado derecho */}
          <View style={styles.actions}>
            {/* Modo oscuro/claro */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={styles.iconBtn}
              accessibilityLabel={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
              accessibilityRole="button"
            >
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color="rgba(255,255,255,0.82)" />
            </TouchableOpacity>

            {/* Campana de notificaciones */}
            {onNotificationsPress && (
              <TouchableOpacity
                onPress={onNotificationsPress}
                style={styles.iconBtn}
                accessibilityLabel={`Notificaciones${unreadCount > 0 ? `, ${unreadCount} sin leer` : ''}`}
                accessibilityRole="button"
              >
                <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.88)" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ─── Search bar ─── */}
      {!isWide && (
        <View style={styles.searchWrapper}>
          <View style={[
            styles.searchCard,
            { backgroundColor: theme.glass, borderColor: theme.glassBorder, shadowColor: theme.shadowColor },
          ]}>
            <SearchBar ref={searchRef} onSearch={onSearch} placeholder="Buscar tareas..." initialValue={searchText} />
          </View>
        </View>
      )}

      {/* ─── Filter chips ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.chipsRow, isWide && { paddingTop: 12 }]}
        style={styles.chipsScroll}
      >
        {FILTERS.map(f => (
          <GlassChip
            key={f.id}
            label={f.label}
            icon={f.icon}
            count={statusCounts[f.id]}
            active={quickStatusFilter === f.id}
            onPress={() => onFilterChange?.(f.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  gradientWide: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  userBlock: { flex: 1 },
  // En pantalla ancha el bloque mide lo que ocupa su contenido. Con `flex: 0` en web
  // quedaba con ancho cero: el nombre se apilaba letra por letra bajo el buscador.
  // Puede encogerse (el nombre se corta con "…") para dejarle espacio al buscador.
  userBlockWide: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto', minWidth: 60 },
  userInfoWide: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto', maxWidth: 220 },
  // El buscador conserva un ancho útil aunque la ventana sea estrecha
  searchCardWide: { flex: 1, minWidth: 200, marginHorizontal: 16 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.38)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.68)',
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  roleTag: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.90)',
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
    marginTop: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchWrapper: { marginTop: -18, paddingHorizontal: 16, zIndex: 10 },
  searchCard: {
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  chipsScroll: { marginTop: 12 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
});
