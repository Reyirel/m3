/**
 * ProfileScreenEnhanced.js
 * Pantalla de perfil con datos reales del usuario autenticado
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassmorphicCard,
  GlassmorphicButton,
  GlassmorphicAvatar,
  GlassmorphicDivider,
  GlassmorphicStatsCard,
} from '../components';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { logoutUser } from '../services/authFirestore';
import { toMs } from '../utils/dateUtils';
import { isInProgress } from '../utils/taskStatus';
import { hapticMedium } from '../utils/haptics';
import { confirmAlert, infoAlert } from '../utils/alert';
import { useResponsive } from '../utils/responsive';

const ProfileScreenEnhanced = ({ navigation, onLogout }) => {
  const { theme } = useTheme();
  const { tasks, currentUser } = useTasks();
  const { padding } = useResponsive();

  const displayName = currentUser?.displayName || currentUser?.name || 'Usuario';
  const userEmail = currentUser?.email || '';
  const userRole = currentUser?.role || 'usuario';
  const roleLabel = userRole === 'admin' ? 'Administrador'
    : userRole === 'supervisor' ? 'Supervisor'
    : userRole === 'jefe_area' ? 'Jefe de Área'
    : 'Usuario';

  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'cerrada').length,
    inProgressTasks: tasks.filter(t => isInProgress(t.status)).length,
    overdueTasks: tasks.filter(t => t.dueAt && toMs(t.dueAt) < Date.now() && t.status !== 'cerrada').length,
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const handleLogout = useCallback(() => {
    hapticMedium();
    confirmAlert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      async () => {
        try {
          await logoutUser();
        } catch (_) {}
        if (onLogout) onLogout();
      },
      'Cerrar sesión'
    );
  }, [onLogout]);

  const profileSections = [
    {
      title: 'Información Personal',
      icon: 'person-outline',
      items: [
        { label: 'Nombre', value: displayName, icon: 'person-outline' },
        { label: 'Email', value: userEmail || 'Sin email', icon: 'mail-outline' },
        { label: 'Rol', value: roleLabel, icon: 'shield-outline' },
      ],
    },
    {
      title: 'Configuración de Cuenta',
      icon: 'settings-outline',
      items: [
        {
          label: 'Notificaciones',
          action: true,
          icon: 'notifications-outline',
          onPress: () => navigation.navigate('Notifications'),
        },
        {
          label: 'Cambiar contraseña',
          action: true,
          icon: 'lock-closed-outline',
          onPress: () => infoAlert('Próximamente', 'Esta función estará disponible en una próxima versión.'),
        },
        {
          label: 'Privacidad',
          action: true,
          icon: 'eye-outline',
          onPress: () => infoAlert('Próximamente', 'Esta función estará disponible en una próxima versión.'),
        },
      ],
    },
  ];

  const renderInfoItem = useCallback((item, index, total) => (
    <View key={index}>
      <TouchableOpacity
        onPress={item.onPress}
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
            {item.value ? (
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {item.value}
              </Text>
            ) : null}
          </View>
          {item.action && (
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
      {index < total - 1 && <GlassmorphicDivider />}
    </View>
  ), [theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Mi Perfil"
        subtitle="Información y configuración de cuenta"
        icon="person-circle"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <GlassmorphicAvatar
            name={displayName}
            size="xlarge"
            status="online"
          />
          <Text style={[styles.userName, { color: theme.text }]}>
            {displayName}
          </Text>
          <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
            {userEmail}
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
            change={stats.overdueTasks > 0 ? 'Atender' : 'Al día'}
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
              <View style={[styles.sectionIcon, { backgroundColor: theme.primaryAlpha }]}>
                <Ionicons name={section.icon} size={18} color={theme.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {section.title}
              </Text>
            </View>
            <GlassmorphicCard style={styles.sectionCard}>
              {section.items.map((item, itemIndex) =>
                renderInfoItem(item, itemIndex, section.items.length)
              )}
            </GlassmorphicCard>
          </View>
        ))}

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

        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>
            App v1.4.2
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
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
  },
});

export default ProfileScreenEnhanced;
