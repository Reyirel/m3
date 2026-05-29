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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  GlassmorphicCard,
  GlassmorphicButton,
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

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
        contentInsetAdjustmentBehavior="never"
      >
        {/* Hero Section — gradiente + avatar + progreso */}
        <LinearGradient
          colors={theme.gradientHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{getInitials(displayName)}</Text>
          </View>
          <Text style={styles.heroName}>{displayName}</Text>
          {!!userEmail && (
            <Text style={styles.heroEmail} numberOfLines={1}>{userEmail}</Text>
          )}
          <View style={styles.heroRoleBadge}>
            <Ionicons name="shield-checkmark-outline" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={styles.heroRoleText}>{roleLabel.toUpperCase()}</Text>
          </View>
          {/* Barra de progreso de completado */}
          <View style={styles.progressSection}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {completionRate}% de tareas completadas
            </Text>
          </View>
        </LinearGradient>

        {/* Statistics Grid */}
        <View style={[styles.statsGrid, { paddingHorizontal: 16 }]}>
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

        <GlassmorphicDivider style={{ marginHorizontal: 16 }} />

        {/* Profile Sections */}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={[styles.section, { paddingHorizontal: 16 }]}>
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
        <View style={[styles.section, { paddingHorizontal: 16 }]}>
          <GlassmorphicButton
            title="Cerrar Sesión"
            onPress={handleLogout}
            variant="outline"
            icon="log-out-outline"
            color={theme.error}
            fullWidth={true}
          />
        </View>

        <View style={[styles.footer, { paddingHorizontal: 16 }]}>
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
    paddingBottom: 40,
    gap: 24,
  },
  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 16 : 16,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.40)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.68)',
    marginTop: 2,
  },
  heroRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  heroRoleText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 1,
  },
  progressSection: {
    width: '100%',
    marginTop: 14,
    gap: 6,
  },
  progressBg: {
    width: '100%',
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.20)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'right',
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
