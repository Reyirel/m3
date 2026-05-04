import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Platform, Modal, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import GlassChip from './GlassChip';
import SearchBar from '../SearchBar';
import { logoutUser } from '../../services/authFirestore';

const FILTERS = [
  { id: 'todas',       label: 'Todas',       icon: 'list'                          },
  { id: 'pendiente',   label: 'Pendiente',   icon: 'time-outline'                  },
  { id: 'en-progreso', label: 'En progreso', icon: 'play-circle-outline'           },
  { id: 'revision',    label: 'Revisión',    icon: 'eye-outline'                   },
  { id: 'cerrada',     label: 'Completadas', icon: 'checkmark-done-circle-outline' },
];

export default function HomeHeader({
  userName = 'Usuario',
  userEmail = '',
  role = 'USUARIO',
  onSearch,
  searchText = '',
  quickStatusFilter = 'todas',
  onFilterChange,
  statusCounts = {},
  onLogout,
}) {
  const { theme, isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
    } catch {}

    if (Platform.OS === 'web') {
      // Reload is the most reliable way to reset nav state on web
      window.location.reload();
      return;
    }
    setShowModal(false);
    onLogout?.();
  };

  return (
    <View>
      {/* ─── Gradient header ─── */}
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.userBlock}>
            <Text style={styles.greeting}>Hola,</Text>
            <Text style={styles.name} numberOfLines={1}>{userName}</Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={styles.logoutBtn}
            accessibilityLabel="Cerrar sesión"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.82)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ─── Search bar ─── */}
      <View style={styles.searchWrapper}>
        <View style={[
          styles.searchCard,
          { backgroundColor: theme.glass, borderColor: theme.glassBorder, shadowColor: theme.shadowColor },
        ]}>
          <SearchBar onSearch={onSearch} placeholder="Buscar tareas..." initialValue={searchText} />
        </View>
      </View>

      {/* ─── Filter chips ─── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chipsScroll}
      >
        {FILTERS.map(f => (
          <GlassChip
            key={f.id}
            label={f.label}
            icon={f.icon}
            count={statusCounts[f.id]}
            active={quickStatusFilter === f.id}
            onPress={() => onFilterChange?.(f.id)}
          />
        ))}
      </ScrollView>

      {/* ─── Logout confirmation modal ─── */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.overlay}>
          <View style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              shadowColor: theme.shadowColor,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            },
          ]}>
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(159,34,65,0.12)' }]}>
              <Ionicons name="log-out-outline" size={28} color={theme.primary} />
            </View>

            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#1C1C1E' }]}>
              Cerrar sesión
            </Text>
            <Text style={[styles.modalSub, { color: isDark ? 'rgba(255,255,255,0.55)' : '#6B6B6B' }]}>
              ¿Estás seguro de que deseas salir de tu cuenta?
            </Text>

            <View style={styles.btnRow}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[styles.btn, styles.btnCancel, { borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)' }]}
                disabled={loggingOut}
              >
                <Text style={[styles.btnText, { color: isDark ? 'rgba(255,255,255,0.70)' : '#555' }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmLogout}
                style={[styles.btn, styles.btnConfirm, { backgroundColor: theme.primary }]}
                disabled={loggingOut}
              >
                {loggingOut
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={[styles.btnText, { color: '#FFF', fontWeight: '700' }]}>Salir</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#9F2241',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  userBlock: { flex: 1 },
  greeting: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.68)',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  roleTag: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.90)',
    letterSpacing: 1,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    marginTop: 2,
  },
  searchWrapper: { marginTop: -18, paddingHorizontal: 16, zIndex: 10 },
  searchCard: {
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  chipsScroll: { marginTop: 12 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancel: { borderWidth: 1.5 },
  btnConfirm: {},
  btnText: { fontSize: 15 },
});
