/**
 * 🎯 CompactSearchHeader.js - Header unificado collapsible
 * 
 * UN ÚNICO BLOQUE que contiene:
 * - Colapsado (80px): Nombre completo + email + rol + chevron
 * - Expandido: Buscador + Filtros por estado + Acciones + logout
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import SearchBar from './SearchBar';
import { getAuth, signOut } from 'firebase/auth';

export default function CompactSearchHeader({
  userName = 'Usuario',
  userEmail = 'email@example.com',
  role = 'DIRECTOR',
  onSearch = null,
  searchText = '',
  quickStatusFilter = 'todas',
  onFilterChange = null,
  statusCounts = {},
  navigation = null,
}) {
  const { theme, isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    const newValue = isExpanded ? 0 : 1;
    
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: newValue,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: newValue,
        duration: 300,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const handleLogout = async () => {
    Alert.alert(
      '¿Cerrar sesión?',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
        {
          text: 'Sí, salir',
          onPress: async () => {
            try {
              const auth = getAuth();
              await signOut(auth);
              navigation?.replace('Login');
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const expandedHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });

  const filters = [
    { id: 'todas', label: 'Todas', icon: 'list', count: statusCounts.todas },
    { id: 'pendiente', label: 'Pendiente', icon: 'time-outline', count: statusCounts.pendiente },
    { id: 'en-progreso', label: 'En progreso', icon: 'play-circle-outline', count: statusCounts['en-progreso'] },
    { id: 'revision', label: 'Revisión', icon: 'eye-outline', count: statusCounts.revision },
    { id: 'cerrada', label: 'Completadas', icon: 'checkmark-done-circle-outline', count: statusCounts.cerrada },
  ];

  return (
    <LinearGradient
      colors={theme.gradientPrimary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.8 }}
      style={styles.container}
    >
      {/* HEADER COLAPSADO - Siempre visible */}
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.8}
        style={styles.collapsedHeader}
        accessible={true}
        accessibilityLabel={`${userName} - ${role}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityHint={isExpanded ? 'Toca para contraer' : 'Toca para expandir filtros y más opciones'}
      >
        {/* Nombre + email + rol a la izquierda */}
        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.userEmail} numberOfLines={1}>
            {userEmail}
          </Text>
          <View style={styles.roleTag}>
            <Text style={styles.role}>{role}</Text>
          </View>
        </View>

        {/* Chevron + Logout a la derecha */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutBtn}
            accessible={true}
            accessibilityLabel="Cerrar sesión"
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Ionicons name="chevron-down" size={24} color="#FFF" />
          </Animated.View>
        </View>
      </TouchableOpacity>

      {/* HEADER EXPANDIDO - Buscador + Filtros + Logout */}
      <Animated.View
        style={[
          styles.expandedContent,
          { 
            height: expandedHeight,
            opacity: heightAnim,
          },
        ]}
        accessible={isExpanded}
        accessibilityLabel="Filtros y opciones"
      >
        {/* Buscador */}
        <View style={styles.searchContainer}>
          <SearchBar 
            onSearch={onSearch} 
            placeholder="Buscar tareas..." 
            initialValue={searchText}
          />
        </View>

        {/* Filtros por estado */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Por estado:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
          >
            <View style={styles.filterChipsRow}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  onPress={() => onFilterChange?.(filter.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.filterChip,
                    quickStatusFilter === filter.id && styles.filterChipActive,
                  ]}
                  accessible={true}
                  accessibilityLabel={`Filtro: ${filter.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: quickStatusFilter === filter.id }}
                >
                  <Ionicons
                    name={filter.icon}
                    size={14}
                    color={quickStatusFilter === filter.id ? '#FFF' : 'rgba(255,255,255,0.6)'}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      quickStatusFilter === filter.id && styles.filterChipTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  {filter.count != null && filter.count > 0 && (
                    <View style={[
                      styles.filterChipBadge,
                      quickStatusFilter === filter.id && styles.filterChipBadgeActive,
                    ]}>
                      <Text style={styles.filterChipBadgeText}>{filter.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  collapsedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 80,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  userEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  roleTag: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  role: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,107,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  searchContainer: {
    marginBottom: 12,
    marginTop: 8,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    marginLeft: 4,
  },
  filtersScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  filterChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  filterChipBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterChipBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  filterChipBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFF',
  },
});
