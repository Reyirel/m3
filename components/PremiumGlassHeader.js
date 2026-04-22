/**
 * PremiumGlassHeader.js
 * Header premium con glassmorfismo: gradiente + blur real + rim luminoso
 */

import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';

export default function PremiumGlassHeader({
  displayName,
  email,
  roleIcon = 'person',
  roleBadgeColor = '#9F2241',
  roleLabel = 'User',
  onLogoutPress,
}) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Rim luminoso superior */}
      <View
        style={[
          styles.rimGlow,
          { backgroundColor: isDark ? theme.glassBorder : theme.glassBorderStrong },
        ]}
      />

      {/* Fondo glassmorphic — LinearGradient + BlurView apilados */}
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.92 : 1 }]}
      />
      {Platform.OS !== 'web' && (
        <BlurView
          intensity={isDark ? 40 : 20}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      )}
      {Platform.OS === 'web' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              backgroundColor: isDark ? theme.glassLight : 'rgba(0,0,0,0.08)',
            },
          ]}
        />
      )}

      {/* Contenido */}
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        <View style={styles.userInfo}>
          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor + 'CC' }]}>
            <Ionicons name={roleIcon} size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>

          {/* Nombre de usuario */}
          <Text style={[styles.userName, { color: '#FFFFFF' }]} numberOfLines={1}>
            {displayName || email}
          </Text>

          {/* Email opcional */}
          {displayName && email && (
            <Text style={[styles.userEmail, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
              {email}
            </Text>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={onLogoutPress}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: 'rgba(239,68,68,0.20)',
              borderColor: 'rgba(239,68,68,0.40)',
            },
            Platform.OS === 'web' && { cursor: 'pointer' },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={16} color="#FF6B6B" />
          <Text style={[styles.logoutText, { color: '#FF6B6B' }]}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom glow line */}
      <View
        style={[
          styles.bottomGlow,
          { backgroundColor: isDark ? theme.glassBorder : 'rgba(255,255,255,0.25)' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.15)',
    overflow: 'hidden',
  },
  rimGlow: {
    height: 1,
    width: '100%',
    zIndex: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  userInfo: {
    flex: 1,
    marginRight: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bottomGlow: {
    height: 1,
    width: '100%',
  },
});
