// screens/area/AreaManagementScreen.js
// Pantalla para gestionar áreas dinámicamente

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { showDialog } from '../../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeToAreas, deleteArea } from '../../services/area/areaManagement';
import { useNotification } from '../../contexts/NotificationContext';
import AreaFormModal from './AreaFormModal';
import ShimmerEffect from '../../components/ShimmerEffect';
import ScreenHeader from '../../components/ui/ScreenHeader';
import { syncPendingOperations } from '../../services/offlineSync';

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
    const confirmDelete = await new Promise((resolve) => {
      showDialog({
        title: 'Eliminar área',
        message: `¿Seguro que deseas eliminar "${area.nombre}"?\n\nEsto solo funcionará si no tiene tareas activas.`,
        buttons: [
          { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' },
        ],
      });
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
    // Los datos llegan en tiempo real; el gesto envía lo que quedó pendiente sin conexión
    syncPendingOperations().catch(() => {}).finally(() => setRefreshing(false));
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
    <View key={area.id} style={[styles.areaCard, { backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.glassBorder }]}>
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
            accessibilityRole="button"
            accessibilityLabel="Editar"
          >
            <Ionicons name="pencil" size={18} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.errorAlpha }]}
            onPress={() => handleDeleteArea(area)}
            accessibilityRole="button"
            accessibilityLabel="Eliminar"
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
        <ScreenHeader title="Gestión de áreas" onBack={() => navigation.goBack()} />
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
      <ScreenHeader
        title="Gestión de áreas"
        subtitle={`${areas.length} áreas registradas`}
        onBack={() => navigation.goBack()}
        actions={[{ icon: 'add', label: 'Crear área', onPress: handleCreateArea }]}
      />

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
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: -0.5,
      textShadowColor: 'rgba(0,0,0,0.20)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
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
      fontSize: 16,
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
      borderRadius: 10,
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
