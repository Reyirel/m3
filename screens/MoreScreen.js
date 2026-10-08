// screens/MoreScreen.js
// Pestaña "Más": todo lo que no cabe en la barra inferior del celular.
// La barra muestra como máximo cinco pestañas; reportes, paneles, administración,
// perfil, configuración y cerrar sesión viven aquí.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ScreenHeader from '../components/ui/ScreenHeader';
import { subscribeToUnreadCount } from '../services/notificationsLive';
import { confirmAlert } from '../utils/alert';
import { hapticLight } from '../utils/haptics';
import { roleLabel } from '../services/permissions';
import { SPACING, TYPOGRAPHY, TOUCH_TARGET, MAX_WIDTHS } from '../theme/tokens';
import OnboardingTour from '../components/OnboardingTour';

function Row({ icon, label, description, badge, danger, onPress, isLast, theme }) {
  const color = danger ? theme.error : theme.text;
  return (
    <TouchableOpacity
      onPress={() => { hapticLight(); onPress(); }}
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.divider },
      ]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} sin leer` : label}
      accessibilityHint={description}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? theme.errorAlpha : theme.primaryAlpha }]}>
        <Ionicons name={icon} size={20} color={danger ? theme.error : theme.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {!!description && (
          <Text style={[styles.rowDescription, { color: theme.textSecondary }]} numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
      {badge > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.error }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      )}
      {!danger && <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />}
    </TouchableOpacity>
  );
}

export default function MoreScreen({ navigation, onLogout }) {
  const { theme } = useTheme();
  const { user, isAdmin, isSecretario, isDirector } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  // Contador en tiempo real (lo alimenta NotificationWatcher en App.js)
  useEffect(() => subscribeToUnreadCount(setUnreadCount), []);

  const sections = useMemo(() => {
    const go = (name) => () => navigation.navigate(name);

    const work = [
      (isAdmin || isSecretario || isDirector) && { icon: 'bar-chart-outline', label: 'Reportes', description: 'Avance y cumplimiento', onPress: go('Reports') },
      isSecretario && { icon: 'briefcase-outline', label: 'Panel de mi secretaría', description: 'Tareas de tus direcciones', onPress: go('SecretarioDashboard') },
      isDirector && { icon: 'briefcase-outline', label: 'Panel de mi área', description: 'Tus tareas y tu equipo', onPress: go('AreaChiefDashboard') },
      isAdmin && { icon: 'speedometer-outline', label: 'Panel ejecutivo', description: 'Indicadores de todas las áreas', onPress: go('ExecutiveDashboard') },
      isAdmin && { icon: 'people-outline', label: 'Administración', description: 'Usuarios, áreas y contraseñas', onPress: go('Admin') },
    ].filter(Boolean);

    const tools = [
      { icon: 'notifications-outline', label: 'Notificaciones', badge: unreadCount, onPress: go('Notifications') },
      { icon: 'search-outline', label: 'Buscar tareas', onPress: go('Search') },
      { icon: 'help-circle-outline', label: 'Tutorial', description: 'Recorrido por la app, paso a paso', onPress: () => setShowTutorial(true) },
      isAdmin && { icon: 'trash-outline', label: 'Papelera', description: 'Tareas eliminadas', onPress: go('Trash') },
    ].filter(Boolean);

    const account = [
      { icon: 'person-circle-outline', label: 'Mi perfil', onPress: go('Profile') },
      { icon: 'settings-outline', label: 'Configuración', description: 'Tema, notificaciones y datos', onPress: go('Settings') },
    ];

    const session = [
      {
        icon: 'log-out-outline',
        label: 'Cerrar sesión',
        danger: true,
        onPress: () => confirmAlert(
          'Cerrar sesión',
          '¿Quieres salir de tu cuenta en este dispositivo?',
          () => onLogout?.(),
          'Cerrar sesión'
        ),
      },
    ];

    return [
      work.length > 0 && { title: 'Trabajo', items: work },
      { title: 'Herramientas', items: tools },
      { title: 'Cuenta', items: account },
      { title: null, items: session },
    ].filter(Boolean);
  }, [navigation, isAdmin, isSecretario, isDirector, unreadCount, onLogout]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Más"
        subtitle={[user?.displayName, roleLabel(user?.role)].filter(Boolean).join(' · ')}
        icon="ellipsis-horizontal"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section, index) => (
          <View key={section.title || `section-${index}`} style={styles.section}>
            {!!section.title && (
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} accessibilityRole="header">
                {section.title}
              </Text>
            )}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.glassBorder }]}>
              {section.items.map((item, itemIndex) => (
                <Row
                  key={item.label}
                  {...item}
                  theme={theme}
                  isLast={itemIndex === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* El tutorial se puede volver a ver cuando haga falta */}
      {showTutorial && (
        <OnboardingTour userRole={user?.role} forceShow onComplete={() => setShowTutorial(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
    width: '100%',
    maxWidth: MAX_WIDTHS.card,
    alignSelf: 'center',
  },
  section: { marginBottom: SPACING.xl },
  sectionTitle: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: TOUCH_TARGET.large,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { ...TYPOGRAPHY.body, fontWeight: '500' },
  rowDescription: { ...TYPOGRAPHY.caption, marginTop: 2 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { ...TYPOGRAPHY.caption, fontWeight: '700', color: '#FFFFFF' },
});
