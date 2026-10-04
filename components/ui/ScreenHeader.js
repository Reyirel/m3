import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

// Encabezado común de las pantallas.
//   actions: [{ icon, label, onPress, disabled?, color?, badge?, active?, primary? }]
//     badge   → contador sobre el botón (vencidas, mensajes sin leer)
//     active  → botón resaltado (un filtro o una vista que está encendida)
//     primary → acción principal de la pantalla (crear)
export default function ScreenHeader({ title, subtitle, icon, actions = [], onBack }) {
  const { theme } = useTheme();
  // Con muchas acciones los botones se hacen un poco más chicos para dejarle lugar al título
  const compact = actions.length > 3;

  return (
    <LinearGradient
      colors={theme.gradientHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.actionBtn, { marginRight: 12 }]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.90)" />
          </TouchableOpacity>
        )}

        <View style={styles.titleBlock}>
          {icon && !onBack && (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color="rgba(255,255,255,0.90)" />
            </View>
          )}
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>

        {actions.length > 0 && (
          <View style={[styles.actionsRow, compact && styles.actionsRowCompact]}>
            {actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                onPress={action.onPress}
                disabled={action.disabled}
                style={[
                  styles.actionBtn,
                  compact && styles.actionBtnCompact,
                  action.active && styles.actionBtnActive,
                  action.primary && styles.actionBtnPrimary,
                  action.disabled && { opacity: 0.4 },
                ]}
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
                accessibilityRole="button"
                accessibilityLabel={action.badge > 0 ? `${action.label}, ${action.badge}` : action.label}
                accessibilityState={action.active === undefined ? undefined : { selected: !!action.active }}
              >
                <Ionicons
                  name={action.icon}
                  size={action.primary ? 24 : 20}
                  color={action.primary ? theme.primary : action.color || 'rgba(255,255,255,0.90)'}
                />
                {action.badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.error }]}>
                    <Text style={styles.badgeText}>{action.badge > 99 ? '99+' : action.badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.62)',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRowCompact: { gap: 6 },
  actionBtnCompact: { width: 36, height: 36, borderRadius: 18 },
  actionBtnActive: { backgroundColor: 'rgba(255,255,255,0.32)', borderColor: 'rgba(255,255,255,0.55)' },
  actionBtnPrimary: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
