import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { useTheme } from '../../contexts/ThemeContext';
import GlassChip from './GlassChip';
import SearchBar from '../SearchBar';

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
  navigation,
}) {
  const { theme } = useTheme();

  const handleLogout = () => {
    Alert.alert('¿Cerrar sesión?', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(getAuth());
            navigation?.replace('Login');
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  return (
    <View>
      {/* Gradient header */}
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
            onPress={handleLogout}
            style={styles.logoutBtn}
            accessibilityLabel="Cerrar sesión"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.82)" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search bar — flota sobre el borde inferior del gradient */}
      <View style={styles.searchWrapper}>
        <View style={[
          styles.searchCard,
          {
            backgroundColor: theme.glass,
            borderColor: theme.glassBorder,
            shadowColor: theme.shadowColor,
          },
        ]}>
          <SearchBar
            onSearch={onSearch}
            placeholder="Buscar tareas..."
            initialValue={searchText}
          />
        </View>
      </View>

      {/* Filter chips */}
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
  userBlock: {
    flex: 1,
  },
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
  searchWrapper: {
    marginTop: -18,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  searchCard: {
    borderRadius: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  chipsScroll: {
    marginTop: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
