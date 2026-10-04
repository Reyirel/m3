// screens/TrashScreen.js
// Papelera de tareas (solo administrador): lista lo eliminado y permite restaurarlo.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ui/ScreenHeader';
import { useTheme } from '../contexts/ThemeContext';
import { useTasks } from '../contexts/TasksContext';
import { useNotification } from '../contexts/NotificationContext';
import { subscribeToTrash, restoreTask } from '../services/tasks';
import { hapticMedium } from '../utils/haptics';
import EmptyState from '../components/EmptyState';

const formatDate = (ms) =>
  ms ? new Date(ms).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : 'fecha desconocida';

export default function TrashScreen({ navigation }) {
  const { theme } = useTheme();
  const { currentUser } = useTasks();
  const { showSuccess, showError } = useNotification();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return undefined;
    }
    return subscribeToTrash(
      (deletedTasks) => {
        setTasks(deletedTasks);
        setLoading(false);
      },
      () => {
        setLoading(false);
        showError('No se pudo cargar la papelera');
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const handleRestore = useCallback(async (task) => {
    hapticMedium();
    setRestoringId(task.id);
    try {
      await restoreTask(task.id);
      showSuccess(`"${task.title || 'Tarea'}" restaurada`);
    } catch (error) {
      showError(`No se pudo restaurar: ${error.message}`);
    } finally {
      setRestoringId(null);
    }
  }, [showSuccess, showError]);

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardBody}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {item.title || 'Tarea sin título'}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.area || 'Sin área'}
        </Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
          Eliminada el {formatDate(item.deletedAt)}{item.deletedBy ? ` por ${item.deletedBy}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.restoreBtn, { backgroundColor: theme.primary }, restoringId === item.id && { opacity: 0.6 }]}
        onPress={() => handleRestore(item)}
        disabled={restoringId !== null}
        accessibilityRole="button"
        accessibilityLabel={`Restaurar ${item.title || 'tarea'}`}
      >
        {restoringId === item.id
          ? <ActivityIndicator size="small" color="#FFFFFF" />
          : <Ionicons name="arrow-undo" size={16} color="#FFFFFF" />}
        <Text style={styles.restoreText}>Restaurar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      icon={isAdmin ? 'trash-outline' : 'lock-closed'}
      title={isAdmin ? 'La papelera está vacía' : 'Sin acceso'}
      message={isAdmin
        ? 'Las tareas que elimines aparecerán aquí y podrás restaurarlas.'
        : 'Solo el administrador puede ver la papelera.'}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Papelera"
        subtitle={isAdmin && tasks.length > 0 ? `${tasks.length} tarea${tasks.length === 1 ? '' : 's'} eliminada${tasks.length === 1 ? '' : 's'}` : 'Tareas eliminadas'}
        onBack={() => navigation.goBack()}
      />
      {loading ? (
        <ActivityIndicator style={styles.loader} color={theme.primary} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.list, tasks.length === 0 && styles.listEmpty]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { marginTop: 40 },
  list: { padding: 16, gap: 12 },
  listEmpty: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardBody: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, fontWeight: '500' },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
  },
  restoreText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 6 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
