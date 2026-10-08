/**
 * SettingsScreen.js
 * Pantalla de configuración mejorada con glasmorphism
 * Temas, notificaciones, privacidad, cuenta
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassmorphicCard } from '../components';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { hapticMedium } from '../utils/haptics';
import { confirmAlert, infoAlert } from '../utils/alert';
import { requestBrowserNotificationPermission } from '../services/notificationsLive';

const SettingsScreen = ({ navigation, onLogout }) => {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { currentUser } = useTasks();
  const isAdmin = currentUser?.role === 'admin';

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationsEnabled, setVibrationsEnabled] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Automático → Claro → Oscuro. "Automático" sigue al dispositivo.
  const handleThemeCycle = useCallback(() => {
    hapticMedium();
    const next = { system: 'light', light: 'dark', dark: 'system' };
    setThemeMode(next[themeMode] || 'system');
  }, [themeMode, setThemeMode]);

  const themeModeLabel = themeMode === 'system'
    ? `Automático (${isDark ? 'oscuro' : 'claro'}, según el dispositivo)`
    : themeMode === 'dark' ? 'Oscuro' : 'Claro';

  const settingGroups = [
    {
      title: 'Apariencia',
      icon: 'color-palette-outline',
      items: [
        {
          label: 'Tema',
          description: themeModeLabel,
          icon: themeMode === 'system' ? 'contrast-outline' : isDark ? 'moon' : 'sunny-outline',
          onPress: handleThemeCycle,
        },
      ],
    },
    {
      title: 'Notificaciones',
      icon: 'notifications-outline',
      items: [
        {
          label: 'Notificaciones',
          description: 'Recibir alertas y cambios',
          icon: 'notifications-outline',
          toggle: notificationsEnabled,
          onToggle: (value) => {
            hapticMedium();
            setNotificationsEnabled(value);
            // Web: al activarlas se pide permiso al navegador para avisar cuando
            // la pestaña está en segundo plano
            if (value) requestBrowserNotificationPermission();
          },
        },
        {
          label: 'Sonido',
          description: 'Sonidos de notificación',
          icon: 'volume-high-outline',
          toggle: soundEnabled,
          onToggle: (value) => {
            hapticMedium();
            setSoundEnabled(value);
          },
          disabled: !notificationsEnabled,
        },
        {
          label: 'Vibraciones',
          description: 'Retroalimentación háptica',
          icon: 'hand-right-outline',
          toggle: vibrationsEnabled,
          onToggle: (value) => {
            hapticMedium();
            setVibrationsEnabled(value);
          },
          disabled: !notificationsEnabled,
        },
      ],
    },
    {
      title: 'Datos y sincronización',
      icon: 'cloud-download-outline',
      items: [
        {
          label: 'Sincronización sin conexión',
          description: 'Guardar cambios sin internet',
          icon: 'cloud-outline',
          toggle: offlineSync,
          onToggle: (value) => {
            hapticMedium();
            setOfflineSync(value);
          },
        },
        {
          label: 'Análisis anónimos',
          description: 'Ayudar a mejorar la app',
          icon: 'bar-chart-outline',
          toggle: analyticsEnabled,
          onToggle: (value) => {
            hapticMedium();
            setAnalyticsEnabled(value);
          },
        },
      ],
    },
    // Solo el administrador: lo eliminado se puede revisar y restaurar
    ...(isAdmin ? [{
      title: 'Administración',
      icon: 'shield-checkmark-outline',
      items: [
        {
          label: 'Papelera de tareas',
          description: 'Ver y restaurar tareas eliminadas',
          icon: 'trash-outline',
          onPress: () => {
            hapticMedium();
            navigation.navigate('Trash');
          },
        },
      ],
    }] : []),
    {
      title: 'Cuenta',
      icon: 'person-outline',
      items: [
        {
          label: 'Perfil',
          description: 'Ver y editar información',
          icon: 'person-circle-outline',
          onPress: () => {
            hapticMedium();
            navigation.navigate('Profile');
          },
        },
        {
          label: 'Privacidad y seguridad',
          description: 'Controlar permisos y datos',
          icon: 'shield-outline',
          onPress: () => {
            hapticMedium();
            infoAlert('Próximamente', 'Esta función estará disponible en una próxima versión.');
          },
        },
        {
          label: 'Cerrar sesión',
          description: 'Salir de tu cuenta',
          icon: 'log-out-outline',
          onPress: () => {
            hapticMedium();
            confirmAlert(
              '¿Cerrar sesión?',
              '¿Estás seguro de que deseas salir?',
              () => onLogout?.(),
              'Salir'
            );
          },
          destructive: true,
        },
      ],
    },
    {
      title: 'Ayuda e información',
      icon: 'help-circle-outline',
      items: [
        {
          label: 'Acerca de',
          description: 'v1.4.2 · Glassmorphic UI',
          icon: 'information-outline',
          onPress: () => {
            hapticMedium();
          },
        },
        {
          label: 'Centro de ayuda',
          description: 'Preguntas frecuentes',
          icon: 'help-outline',
          onPress: () => {
            hapticMedium();
          },
        },
        {
          label: 'Contactar soporte',
          description: 'Reportar problemas',
          icon: 'mail-outline',
          onPress: () => {
            hapticMedium();
          },
        },
      ],
    },
  ];

  const renderSettingItem = useCallback(
    (item, groupIndex, itemIndex, isLast) => {

      return (
        <View key={`${groupIndex}-${itemIndex}`}>
          <TouchableOpacity
            onPress={item.onPress}
            disabled={item.disabled || item.toggle !== undefined}
            activeOpacity={item.disabled ? 1 : 0.6}
          >
            <View
              style={[
                styles.settingItem,
                {
                  backgroundColor: item.disabled
                    ? theme.cardBackground
                    : theme.cardBackground,
                  borderBottomColor: !isLast ? theme.border : 'transparent',
                },
              ]}
            >
              <View
                style={[
                  styles.settingIcon,
                  {
                    backgroundColor: item.destructive
                      ? theme.errorAlpha
                      : theme.primaryAlpha,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.destructive ? theme.error : theme.primary}
                />
              </View>

              <View style={styles.settingContent}>
                <Text
                  style={[
                    styles.settingLabel,
                    {
                      color: item.destructive ? theme.error : theme.text,
                      opacity: item.disabled ? 0.5 : 1,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {item.description && (
                  <Text
                    style={[
                      styles.settingDescription,
                      {
                        color: theme.textMuted,
                        opacity: item.disabled ? 0.4 : 0.7,
                      },
                    ]}
                  >
                    {item.description}
                  </Text>
                )}
              </View>

              {item.toggle !== undefined ? (
                <Switch
                  value={item.toggle}
                  onValueChange={item.onToggle}
                  disabled={item.disabled}
                  trackColor={{
                    false: theme.border,
                    true: theme.primary,
                  }}
                  thumbColor={item.toggle ? theme.primary : theme.textMuted}
                />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={item.disabled ? theme.border : theme.textMuted}
                />
              )}
            </View>
          </TouchableOpacity>

          {!isLast && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.border }} />}
        </View>
      );
    },
    [theme]
  );

  const renderSettingGroup = useCallback(
    (group, groupIndex) => (
      <View key={groupIndex} style={styles.groupContainer}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View
            style={[
              styles.groupIcon,
              { backgroundColor: theme.primaryAlpha },
            ]}
          >
            <Ionicons
              name={group.icon}
              size={18}
              color={theme.primary}
            />
          </View>
          <Text style={[styles.groupTitle, { color: theme.text }]}>
            {group.title}
          </Text>
        </View>

        {/* Group Items */}
        <GlassmorphicCard style={styles.groupCard}>
          {group.items.map((item, itemIndex) =>
            renderSettingItem(item, groupIndex, itemIndex, itemIndex === group.items.length - 1)
          )}
        </GlassmorphicCard>
      </View>
    ),
    [theme, renderSettingItem]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <ScreenHeader
        title="Configuración"
        subtitle="Personaliza tu experiencia"
        icon="settings"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Settings Groups */}
        {settingGroups.map((group, index) => renderSettingGroup(group, index))}

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.version, { color: theme.textMuted }]}>
            Versión 1.4.2 · Glassmorphic UI
          </Text>
          <Text style={[styles.copyright, { color: theme.textMuted }]}>
            © 2024 Proyecto M3 · Todos los derechos reservados
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 24,
  },
  groupContainer: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  groupIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  groupCard: {
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 12,
  },
  footer: {
    paddingTop: 24,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  version: {
    fontSize: 14,
    fontWeight: '500',
  },
  copyright: {
    fontSize: 12,
  },
});

export default SettingsScreen;
