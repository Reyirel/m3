import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY, TOUCH_TARGET } from '../../theme/tokens';
import { ACTIVE_OPACITY, OVERLAY_COLOR } from '../../theme/motion';

// Botones que caben junto al título; el resto va al menú "Más opciones"
const MAX_INLINE_ACTIONS = 3;
// Texto e iconos sobre el encabezado (oscuro en ambos temas)
const ON_HEADER = 'rgba(255,255,255,0.90)';

/** Margen superior de un encabezado: barra de estado o muesca del dispositivo + aire */
export function useHeaderPaddingTop() {
  const insets = useSafeAreaInsets();
  return insets.top + (Platform.OS === 'web' ? SPACING.lg : SPACING.md);
}

// Encabezado común de las pantallas.
//   actions: [{ icon, label, onPress, disabled?, color?, badge?, active?, primary? }]
//     badge   → contador sobre el botón (vencidas, mensajes sin leer)
//     active  → botón resaltado (un filtro o una vista que está encendida)
//     primary → acción principal de la pantalla (crear)
// Con más de tres acciones se muestran las importantes (principal y con contador) y las
// demás pasan a un menú con su nombre: cinco iconos sin texto no se entienden.
export default function ScreenHeader({ title, subtitle, icon, actions = [], onBack }) {
  const { theme } = useTheme();
  const paddingTop = useHeaderPaddingTop();
  const [menuOpen, setMenuOpen] = useState(false);

  let inline = actions;
  let overflow = [];
  if (actions.length > MAX_INLINE_ACTIONS) {
    const slots = MAX_INLINE_ACTIONS - 1;
    const important = actions.filter(a => a.primary || a.badge > 0).slice(0, slots);
    const fill = actions.filter(a => !important.includes(a)).slice(0, slots - important.length);
    inline = actions.filter(a => important.includes(a) || fill.includes(a));
    overflow = actions.filter(a => !inline.includes(a));
  }

  const renderButton = (action, key) => (
    <TouchableOpacity
      key={key}
      onPress={action.onPress}
      disabled={action.disabled}
      activeOpacity={ACTIVE_OPACITY}
      style={[
        styles.actionBtn,
        action.active && styles.actionBtnActive,
        action.primary && styles.actionBtnPrimary,
        action.disabled && { opacity: 0.4 },
      ]}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityLabel={action.badge > 0 ? `${action.label}, ${action.badge}` : action.label}
      accessibilityState={action.active === undefined ? undefined : { selected: !!action.active }}
    >
      <Ionicons
        name={action.icon}
        size={action.primary ? 24 : 20}
        color={action.primary ? theme.primary : action.color || ON_HEADER}
      />
      {action.badge > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <Text style={styles.badgeText}>{action.badge > 99 ? '99+' : action.badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={theme.gradientHeader}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[styles.gradient, { paddingTop, borderBottomColor: theme.glassBorder }]}
    >
      <View style={styles.row}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            activeOpacity={ACTIVE_OPACITY}
            style={[styles.actionBtn, { marginRight: SPACING.md }]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={20} color={ON_HEADER} />
          </TouchableOpacity>
        )}

        <View style={styles.titleBlock}>
          {icon && !onBack && (
            <View style={styles.iconWrap}>
              <Ionicons name={icon} size={20} color={ON_HEADER} />
            </View>
          )}
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{title}</Text>
            {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>

        {actions.length > 0 && (
          <View style={styles.actionsRow}>
            {inline.map((action, i) => renderButton(action, i))}
            {overflow.length > 0 && renderButton({
              icon: 'ellipsis-vertical',
              label: 'Más opciones',
              onPress: () => setMenuOpen(true),
            }, 'more')}
          </View>
        )}
      </View>

      {overflow.length > 0 && (
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setMenuOpen(false)}
            accessibilityLabel="Cerrar menú"
          >
            <View
              style={[
                styles.menu,
                { top: paddingTop + 48, backgroundColor: theme.cardElevated, borderColor: theme.glassBorderStrong, shadowColor: theme.shadowColor },
              ]}
              accessibilityRole="menu"
            >
              {overflow.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => { setMenuOpen(false); action.onPress?.(); }}
                  disabled={action.disabled}
                  activeOpacity={ACTIVE_OPACITY}
                  style={[
                    styles.menuItem,
                    action.active && { backgroundColor: theme.primaryAlpha },
                    action.disabled && { opacity: 0.4 },
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityState={action.active === undefined ? undefined : { selected: !!action.active }}
                >
                  <Ionicons name={action.icon} size={20} color={action.active ? theme.primary : theme.textSecondary} />
                  <Text style={[styles.menuLabel, { color: action.active ? theme.primary : theme.text }]} numberOfLines={1}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingBottom: SPACING.lg,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    gap: SPACING.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
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
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.68)',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginLeft: SPACING.md,
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
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
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
  badgeText: { ...TYPOGRAPHY.overline, letterSpacing: 0, fontWeight: '700', color: '#FFFFFF' },
  menuOverlay: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  menu: {
    position: 'absolute',
    right: SPACING.md,
    minWidth: 220,
    maxWidth: 300,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: TOUCH_TARGET.comfortable,
    paddingHorizontal: SPACING.lg,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  menuLabel: { ...TYPOGRAPHY.body, flex: 1 },
});
