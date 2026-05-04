/**
 * SettingsScreenEnhanced.js
 * Pantalla de configuración mejorada con glasmorphism
 * Temas, notificaciones, privacidad, cuenta
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassmorphicCard,
  GlassmorphicToggle,
  GlassmorphicButton,
  GlassmorphicDivider,
  GlassmorphicEmptyState,
} from '../components';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { hapticMedium } from '../utils/haptics';
import { logoutUser } from '../services/authFirestore';
import { useResponsive } from '../utils/responsive';

const SettingsScreenEnhanced = ({ navigation }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isTablet, padding } = useResponsive();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationsEnabled, setVibrationsEnabled] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const handleThemeToggle = useCallback(() => {
    hapticMedium();
    toggleTheme();
  }, [toggleTheme]);

  const settingGroups = [
    {
      title: 'Apariencia',
      icon: 'palette-outline',
      items: [
        {
          label: 'Modo oscuro',
          description: isDark ? 'Activado' : 'Desactivado',
          icon: isDark ? 'moon' : 'sunny-outline',
          onPress: handleThemeToggle,
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
            // navigation.navigate('ProfileScreen');
          },
        },
        {
          label: 'Privacidad y seguridad',
          description: 'Controlar permisos y datos',
          icon: 'shield-outline',
          onPress: () => {
            hapticMedium();
            // navigation.navigate('PrivacyScreen');
          },
        },
        {
          label: 'Cerrar sesión',
          description: 'Salir de tu cuenta',
          icon: 'log-out-outline',
          onPress: () => {
            hapticMedium();
            Alert.alert('¿Cerrar sesión?', '¿Estás seguro de que deseas salir?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', style: 'destructive', onPress: async () => {
                try { await logoutUser(); } catch {}
              }},
            ]);
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
    (item, groupIndex, itemIndex) => {
      const isLast = itemIndex === settingGroups[groupIndex].items.length - 1;

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

          {!isLast && <GlassmorphicDivider />}
        </View>
      );
    },
    [settingGroups, theme]
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
            renderSettingItem(item, groupIndex, itemIndex)
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
    fontSize: 15,
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
    fontSize: 13,
    fontWeight: '500',
  },
  copyright: {
    fontSize: 11,
  },
});

export default SettingsScreenEnhanced;
