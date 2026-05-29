// screens/area/AreaManagementScreen.js
// Pantalla para gestionar áreas dinámicamente

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeToAreas, deleteArea } from '../../services/area/areaManagement';
import { useNotification } from '../../contexts/NotificationContext';
import AreaFormModal from './AreaFormModal';
import WebSafeBlur from '../../components/WebSafeBlur';
import ShimmerEffect from '../../components/ShimmerEffect';

export default function AreaManagementScreen({ navigation }) {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingArea, setEditingArea] = useState(null);

  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Suscribirse a cambios de áreas
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAreas((fetchedAreas) => {
      setAreas(fetchedAreas);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const handleCreateArea = () => {
    setEditingArea(null);
    setModalVisible(true);
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setModalVisible(true);
  };

  const handleDeleteArea = async (area) => {
    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`¿Seguro que deseas eliminar "${area.nombre}"?\n\nEsto solo funcionará si no tiene tareas activas.`)
      : await new Promise((resolve) => {
          Alert.alert(
            'Eliminar Área',
            `¿Seguro que deseas eliminar "${area.nombre}"?\n\nEsto solo funcionará si no tiene tareas activas.`,
            [
              { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' },
            ]
          );
        });

    if (confirmDelete) {
      const result = await deleteArea(area.id);
      if (result.success) {
        showSuccess(`Área "${area.nombre}" eliminada correctamente`);
      } else {
        showError(result.error || 'Error al eliminar el área');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // La suscripción se actualiza automáticamente
    setTimeout(() => setRefreshing(false), 500);
  };

  const onModalClose = () => {
    setModalVisible(false);
    setEditingArea(null);
    showSuccess('Área actualizada correctamente');
  };

  // Agrupar áreas por tipo
  const secretarias = areas.filter((a) => a.tipo === 'secretaria');
  const direcciones = areas.filter((a) => a.tipo === 'direccion');

  const renderAreaCard = (area) => (
    <View key={area.id} style={[styles.areaCard, { backgroundColor: isDark ? theme.glass : 'rgba(255,255,255,0.85)', borderWidth: 1, borderColor: isDark ? theme.glassBorder : 'rgba(0,0,0,0.07)' }]}>
      <View style={styles.areaCardContent}>
        <View style={styles.areaInfo}>
          <View
            style={[
              styles.colorIndicator,
              { backgroundColor: area.color || theme.primary },
            ]}
          />
          <View style={styles.areaTextContainer}>
            <Text style={[styles.areaName, { color: theme.text }]} numberOfLines={1}>
              {area.nombre}
            </Text>
            <Text style={[styles.areaType, { color: theme.textSecondary }]}>
              {area.tipo === 'secretaria' ? '📋 Secretaría' : '📁 Dirección'}
              {area.jefeId ? ' • Jefe asignado' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.areaActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary + '20' }]}
            onPress={() => handleEditArea(area)}
          >
            <Ionicons name="pencil" size={18} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.errorAlpha }]}
            onPress={() => handleDeleteArea(area)}
          >
            <Ionicons name="trash" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <LinearGradient colors={theme.gradientHeader} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { shadowColor: theme.primary }]}>
          <WebSafeBlur intensity={90} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Gestión de Áreas</Text>
              </View>
            </View>
          </WebSafeBlur>
        </LinearGradient>
        <View style={{ flex: 1, padding: 16 }}>
          {[1,2,3,4,5].map(i => (
            <View key={i} style={{ marginBottom: 12 }}>
              <ShimmerEffect width="100%" height={72} borderRadius={12} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <LinearGradient
        colors={theme.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { shadowColor: theme.primary }]}
      >
        <WebSafeBlur intensity={90} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>Gestión de Áreas</Text>
                <Text style={styles.subtitle}>{areas.length} áreas registradas</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: '#FFFFFF' + '20' }]}
              onPress={handleCreateArea}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </WebSafeBlur>
      </LinearGradient>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        style={styles.content}
      >
        {secretarias.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📋 Secretarías ({secretarias.length})</Text>
            <View style={styles.areasList}>
              {secretarias.map((area) => renderAreaCard(area))}
            </View>
          </View>
        )}

        {direcciones.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📁 Direcciones ({direcciones.length})</Text>
            <View style={styles.areasList}>
              {direcciones.map((area) => renderAreaCard(area))}
            </View>
          </View>
        )}

        {areas.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No hay áreas registradas</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Crea una nueva área para comenzar</Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateArea}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Nueva Área</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <AreaFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editingArea={editingArea}
        onSuccess={onModalClose}
        onError={(error) => showError(error)}
        theme={theme}
        isDark={isDark}
      />

    </View>
  );
}

const createStyles = (_theme, _isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      paddingTop: 48,
      paddingBottom: 20,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
      overflow: 'hidden',
    },
    headerBlur: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backBtn: {
      width: 38,
      height: 38,
      marginRight: 12,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.20)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    subtitle: {
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.72)',
      marginTop: 2,
      fontWeight: '500',
    },
    createBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.20)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    section: {
      marginVertical: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
      letterSpacing: 0.5,
    },
    areasList: {
      gap: 10,
    },
    areaCard: {
      borderRadius: 16,
      padding: 14,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    areaCardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    areaInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },
    colorIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 12,
    },
    areaTextContainer: {
      flex: 1,
    },
    areaName: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 4,
    },
    areaType: {
      fontSize: 12,
      fontWeight: '500',
    },
    areaActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 16,
    },
    emptySubtext: {
      fontSize: 14,
      marginTop: 8,
      marginBottom: 24,
    },
    emptyBtn: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
      gap: 8,
    },
    emptyBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    bottomPadding: {
      height: 20,
    },
  });
