/**
 * ProfileScreenEnhanced.js
 * Pantalla de perfil mejorada con glasmorphism
 * Información de usuario, estadísticas y acciones
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassmorphicHeader,
  GlassmorphicCard,
  GlassmorphicButton,
  GlassmorphicAvatar,
  GlassmorphicDivider,
  GlassmorphicStatsCard,
} from '../components';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import AmbientOrbs from '../components/AmbientOrbs';
import { hapticMedium } from '../utils/haptics';
import { useResponsive } from '../utils/responsive';

const ProfileScreenEnhanced = ({ navigation, route }) => {
  const { theme, isDark } = useTheme();
  const { tasks } = useTasks();
  const { padding } = useResponsive();
  
  // Mock user data (in real app, would come from context/auth)
  const [user] = useState({
    name: 'Hazel Jared',
    email: 'hazel.jared@example.com',
    role: 'admin',
    avatar: 'https://i.prawpic.com/avatar.jpg',
    joinDate: 'Enero 2024',
    status: 'online',
  });

  // Calculate user statistics
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'cerrada').length,
    inProgressTasks: tasks.filter(t => t.status === 'en_proceso' || t.status === 'en_progreso').length,
    overdueTasks: tasks.filter(t => t.isDueOverdue && t.status !== 'cerrada').length,
  };

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const handleLogout = useCallback(() => {
    hapticMedium();
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Cerrar sesión',
          onPress: () => {
            // navigation.navigate('Login');
          },
          style: 'destructive',
        },
      ]
    );
  }, []);

  const profileSections = [
    {
      title: 'Información Personal',
      icon: 'person-outline',
      items: [
        { label: 'Nombre', value: user.name, icon: 'person-outline' },
        { label: 'Email', value: user.email, icon: 'mail-outline' },
        { label: 'Rol', value: user.role.charAt(0).toUpperCase() + user.role.slice(1), icon: 'shield-outline' },
        { label: 'Miembro desde', value: user.joinDate, icon: 'calendar-outline' },
      ],
    },
    {
      title: 'Configuración de Cuenta',
      icon: 'settings-outline',
      items: [
        { label: 'Cambiar contraseña', action: true, icon: 'lock-closed-outline' },
        { label: 'Verificación de dos factores', action: true, icon: 'shield-checkmark-outline' },
        { label: 'Dispositivos conectados', action: true, icon: 'phone-portrait-outline' },
        { label: 'Actividad reciente', action: true, icon: 'time-outline' },
      ],
    },
    {
      title: 'Preferencias',
      icon: 'sliders-outline',
      items: [
        { label: 'Notificaciones', action: true, icon: 'notifications-outline' },
        { label: 'Privacidad', action: true, icon: 'eye-outline' },
        { label: 'Idioma', value: 'Español', icon: 'globe-outline' },
      ],
    },
  ];

  const renderInfoItem = useCallback((item) => (
    <TouchableOpacity
      onPress={item.action ? () => hapticMedium() : undefined}
      disabled={!item.action}
      activeOpacity={item.action ? 0.6 : 1}
      style={item.action && Platform.OS === 'web' ? { cursor: 'pointer' } : undefined}
    >
      <View style={[styles.infoItem, { borderBottomColor: theme.border }]}>
        <View style={[styles.infoIcon, { backgroundColor: theme.primaryAlpha }]}>
          <Ionicons name={item.icon} size={18} color={theme.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
            {item.label}
          </Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>
            {item.value || 'Configurar'}
          </Text>
        </View>
        {item.action && (
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  ), [theme]);

  return (
    <View style={styles.container}>
      <AmbientOrbs intensity="low" />

      {/* Header */}
      <GlassmorphicHeader
        title="Mi Perfil"
        subtitle="Información y configuración de cuenta"
        icon="person-circle"
        showGradient={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <GlassmorphicAvatar
            name={user.name}
            image={user.avatar}
            size="xlarge"
            status={user.status}
          />
          <Text style={[styles.userName, { color: theme.text }]}>
            {user.name}
          </Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {user.email}
          </Text>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <GlassmorphicStatsCard
            icon="checkmark-circle"
            title="Completadas"
            value={stats.completedTasks}
            change={`${completionRate}%`}
            color={theme.success}
            compact={true}
          />
          <GlassmorphicStatsCard
            icon="play-circle"
            title="En Progreso"
            value={stats.inProgressTasks}
            change={`${stats.inProgressTasks} tareas`}
            color={theme.primary}
            compact={true}
          />
          <GlassmorphicStatsCard
            icon="alert-circle"
            title="Vencidas"
            value={stats.overdueTasks}
            change={`${stats.overdueTasks} atender`}
            color={theme.warning}
            compact={true}
          />
          <GlassmorphicStatsCard
            icon="layers"
            title="Total"
            value={stats.totalTasks}
            change={`${stats.totalTasks} tareas`}
            color={theme.info}
            compact={true}
          />
        </View>

        <GlassmorphicDivider />

        {/* Profile Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.primaryAlpha },
                ]}
              >
                <Ionicons
                  name={section.icon}
                  size={18}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {section.title}
              </Text>
            </View>

            <GlassmorphicCard style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  {renderInfoItem(item)}
                  {itemIndex < section.items.length - 1 && (
                    <GlassmorphicDivider />
                  )}
                </View>
              ))}
            </GlassmorphicCard>
          </View>
        ))}

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                { backgroundColor: theme.errorAlpha },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={18} color={theme.error} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Zona de Riesgo
            </Text>
          </View>

          <GlassmorphicCard style={styles.sectionCard}>
            <View style={styles.dangerItem}>
              <View style={styles.dangerContent}>
                <Text style={[styles.dangerLabel, { color: theme.error }]}>
                  Eliminar Cuenta
                </Text>
                <Text style={[styles.dangerDescription, { color: theme.textMuted }]}>
                  Esta acción es irreversible
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.error} />
            </View>
          </GlassmorphicCard>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <GlassmorphicButton
            title="Cerrar Sesión"
            onPress={handleLogout}
            variant="outline"
            icon="log-out-outline"
            color={theme.error}
            fullWidth={true}
          />
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>
            App v1.4.2 · Glasmorphic UI
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 24,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionCard: {
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  dangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  dangerContent: {
    flex: 1,
    gap: 2,
  },
  dangerLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  dangerDescription: {
    fontSize: 13,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
  },
});

export default ProfileScreenEnhanced;
