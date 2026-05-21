/**
 * screens/SettingsScreen.js
 * Pantalla de configuración completamente glassmorphic
 * Organizada en secciones colapsibles con GlassmorphicSection
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { confirmAlert } from '../utils/alert';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import {
  GlassmorphicSection,
  GlassmorphicButton,
  GlassmorphicInput,
} from '../components';

export default function SettingsScreen({ navigation }) {
  const { isDark, toggleTheme, theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { currentUser } = useTasks();

  // Settings state
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    darkMode: isDark,
    soundEnabled: true,
    vibrationsEnabled: true,
    largeText: false,
    dataSync: true,
    autoSync: true,
  });

  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const saveProgress = 0;
  const isSaving = false;

  // Handlers
  const handleToggleSetting = useCallback((key) => {
    if (key === 'darkMode') {
      toggleTheme();
    }
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, [toggleTheme]);

  const handleSaveSettings = useCallback(() => {
    // Simular guardado
    showSuccess('Configuración guardada correctamente');
  }, [showSuccess]);

  const handleResetSettings = useCallback(() => {
    confirmAlert(
      'Restaurar configuración',
      '¿Deseas restaurar la configuración a valores predeterminados?',
      () => {
        setSettings({
          notifications: true,
          emailNotifications: true,
          darkMode: isDark,
          soundEnabled: true,
          vibrationsEnabled: true,
          largeText: false,
          dataSync: true,
          autoSync: true,
        });
        showSuccess('Configuración restaurada');
      },
      'Restaurar'
    );
  }, [isDark, showSuccess]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.background }]}
    >

      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { shadowColor: theme.primary }]}
      >
        <Text style={styles.title}>Configuración</Text>
        <Text style={styles.subtitle}>Personaliza tu experiencia</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* USER PROFILE SECTION */}
        <GlassmorphicSection
          title="Perfil"
          icon="person-circle"
          collapsible={false}
        >
          <View style={styles.profileSection}>
            <GlassmorphicInput
              label="Nombre Completo"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Tu nombre..."
              icon="person"
              maxLength={100}
            />
            <View style={[styles.profileInfo, { borderTopColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {currentUser?.email || 'Sin email'}
              </Text>
            </View>
            <View style={[styles.profileInfo, { borderTopColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Rol</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {currentUser?.role === 'admin' ? 'Administrador' : 
                 currentUser?.role === 'secretario' ? 'Secretario' : 
                 'Usuario'}
              </Text>
            </View>
          </View>
        </GlassmorphicSection>

        {/* NOTIFICATIONS SECTION */}
        <GlassmorphicSection
          title="Notificaciones"
          icon="notifications"
          collapsible={true}
        >
          <View style={styles.settingsList}>
            <SettingToggle
              label="Notificaciones"
              value={settings.notifications}
              onValueChange={() => handleToggleSetting('notifications')}
              theme={theme}
            />
            <SettingToggle
              label="Notificaciones por Email"
              value={settings.emailNotifications}
              onValueChange={() => handleToggleSetting('emailNotifications')}
              theme={theme}
              disabled={!settings.notifications}
            />
            <SettingToggle
              label="Sonido"
              value={settings.soundEnabled}
              onValueChange={() => handleToggleSetting('soundEnabled')}
              theme={theme}
              disabled={!settings.notifications}
            />
            <SettingToggle
              label="Vibraciones"
              value={settings.vibrationsEnabled}
              onValueChange={() => handleToggleSetting('vibrationsEnabled')}
              theme={theme}
              disabled={!settings.notifications}
            />
          </View>
        </GlassmorphicSection>

        {/* DISPLAY SECTION */}
        <GlassmorphicSection
          title="Apariencia"
          icon="moon"
          collapsible={true}
        >
          <View style={styles.settingsList}>
            <SettingToggle
              label="Modo Oscuro"
              value={settings.darkMode}
              onValueChange={() => handleToggleSetting('darkMode')}
              theme={theme}
            />
            <SettingToggle
              label="Texto Grande"
              value={settings.largeText}
              onValueChange={() => handleToggleSetting('largeText')}
              theme={theme}
            />
          </View>
        </GlassmorphicSection>

        {/* DATA SECTION */}
        <GlassmorphicSection
          title="Datos y Sincronización"
          icon="sync"
          collapsible={true}
        >
          <View style={styles.settingsList}>
            <SettingToggle
              label="Sincronización de Datos"
              value={settings.dataSync}
              onValueChange={() => handleToggleSetting('dataSync')}
              theme={theme}
            />
            <SettingToggle
              label="Sincronización Automática"
              value={settings.autoSync}
              onValueChange={() => handleToggleSetting('autoSync')}
              theme={theme}
              disabled={!settings.dataSync}
            />
            <GlassmorphicButton
              title="Sincronizar Ahora"
              onPress={handleSaveSettings}
              variant="secondary"
              size="large"
              icon="refresh"
              loading={isSaving}
            />
          </View>
        </GlassmorphicSection>

        {/* ABOUT SECTION */}
        <GlassmorphicSection
          title="Acerca De"
          icon="information-circle"
          collapsible={true}
        >
          <View style={[styles.aboutSection, { backgroundColor: isDark ? theme.glass : theme.glassStrong }]}>
            <View style={styles.aboutItem}>
              <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>Versión</Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>1.0.0</Text>
            </View>
            <View style={[styles.aboutItem, { borderTopColor: theme.border }]}>
              <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>Build</Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>2026.04.14</Text>
            </View>
            <View style={[styles.aboutItem, { borderTopColor: theme.border }]}>
              <Text style={[styles.aboutLabel, { color: theme.textSecondary }]}>Ambiente</Text>
              <Text style={[styles.aboutValue, { color: theme.text }]}>Production</Text>
            </View>
          </View>
        </GlassmorphicSection>

        {/* ACTION BUTTONS */}
        <View style={styles.actionButtons}>
          <GlassmorphicButton
            title="Guardar Cambios"
            onPress={handleSaveSettings}
            variant="primary"
            size="large"
            icon="checkmark-circle"
            loading={isSaving}
          />
          <GlassmorphicButton
            title="Restaurar Configuración"
            onPress={handleResetSettings}
            variant="outline"
            size="large"
            icon="refresh-circle"
          />
          <GlassmorphicButton
            title="Cerrar"
            onPress={() => navigation.goBack()}
            variant="secondary"
            size="large"
            icon="close-circle"
          />
        </View>

        {/* Safe area bottom */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Helper component for setting toggles
function SettingToggle({ label, value, onValueChange, theme, disabled = false }) {
  return (
    <View style={[
      styles.settingItem,
      {
        borderBottomColor: theme.glassBorder ?? theme.border,
        opacity: disabled ? 0.5 : 1,
      }
    ]}>
      <Text style={[styles.settingLabel, { color: theme.text }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.primary }}
        thumbColor={value ? theme.primary : (theme.textMuted ?? '#aaa')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    elevation: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.20)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 20,
  },
  profileSection: {
    gap: 16,
  },
  profileInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsList: {
    gap: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  aboutSection: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  aboutItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
  },
});
