// components/SubtasksList.js
// Componente para mostrar y gestionar subtareas
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  addSubtask,
  updateSubtaskStatus,
  deleteSubtask,
  subscribeToSubtasks,
  assignSubtaskToUser
} from '../services/tasksMultiple';

function SubtasksList({
  taskId,
  canEdit = true,
  canDelegate = false,
  delegateUsers = [],
  currentUser = null
}) {
  const { theme } = useTheme();
  // Secretarios y admin pueden eliminar subtareas
  const canDelete = canEdit || currentUser?.role === 'secretario';
  const [subtasks, setSubtasks] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDesc, setNewSubtaskDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  
  // Estado para delegación individual
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [selectedSubtask, setSelectedSubtask] = useState(null);
  const [delegating, setDelegating] = useState(false);

  // Escuchar subtareas en tiempo real
  useEffect(() => {
    const unsubscribe = subscribeToSubtasks(taskId, (data) => {
      setSubtasks(data);
    });

    return () => unsubscribe();
  }, [taskId]);

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) {
      Alert.alert('Error', 'El título de la subtarea es requerido');
      return;
    }

    try {
      setLoading(true);
      
      // Crear una promesa con timeout más largo (30 segundos)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          const err = new Error('Tiempo de espera agotado (30s). Verifica tu conexión a Internet.');
          err.code = 'TIMEOUT';
          reject(err);
        }, 30000)
      );
      
      // Crear la subtarea
      const addSubtaskPromise = addSubtask(taskId, {
        title: newSubtaskTitle.trim(),
        description: newSubtaskDesc.trim()
      });
      
      // Esperar a que se complete (con timeout de respaldo)
      const subtaskId = await Promise.race([addSubtaskPromise, timeoutPromise]);
      
      // La subtarea se creó exitosamente, esperar un poco para que la BD se actualice
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Limpiar los campos de entrada
      setNewSubtaskTitle('');
      setNewSubtaskDesc('');
      
      // Cerrar el modal
      setShowAddForm(false);
      
      // Mostrar confirmación de éxito en segundo plano
      setTimeout(() => {
        Alert.alert('Éxito', 'Subtarea creada correctamente', [
          { text: 'OK', onPress: () => {} }
        ]);
      }, 500);
    } catch (error) {
      if (__DEV__) console.error('Error al agregar subtarea:', error);
      
      let errorMessage = error.message || 'Error desconocido';
      
      // Mensajes de error personalizados
      if (error.code === 'TIMEOUT') {
        errorMessage = error.message;
      } else if (error.message?.includes('permisos')) {
        errorMessage = 'Sin permisos. Verifica que el administrador te haya asignado permisos en Firestore.';
      } else if (error.message?.includes('no existe')) {
        errorMessage = 'La tarea padre no existe. Recarga la pantalla e intenta de nuevo.';
      }
      
      // Mostrar el error pero SIN cerrar el modal - permitir reintentar
      Alert.alert(
        'Error al crear subtarea', 
        errorMessage,
        [
          { 
            text: 'Reintentar', 
            onPress: () => {
              // El usuario puede reintentar sin cerrar el modal
            }
          },
          { 
            text: 'Cancelar', 
            onPress: () => {
              setShowAddForm(false);
              setNewSubtaskTitle('');
              setNewSubtaskDesc('');
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubtask = async (subtaskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completada' ? 'pendiente' : 'completada';
      await updateSubtaskStatus(taskId, subtaskId, newStatus);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    Alert.alert(
      'Eliminar Subtarea',
      '¿Estás seguro?',
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Eliminar',
          onPress: async () => {
            try {
              await deleteSubtask(taskId, subtaskId);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  // Función para abrir modal de delegación para una subtarea específica
  const handleOpenDelegateModal = (subtask) => {
    setSelectedSubtask(subtask);
    setShowDelegateModal(true);
  };

  // Función para delegar una subtarea a un director específico
  const handleDelegateSubtask = async (director) => {
    if (!selectedSubtask || !director) return;

    const doDelegate = async () => {
      try {
        setDelegating(true);
        await assignSubtaskToUser(taskId, selectedSubtask.id, {
          email: director.email,
          displayName: director.displayName,
          area: director.area
        });
        
        setShowDelegateModal(false);
        setSelectedSubtask(null);
        
        // Mostrar confirmación
        if (Platform.OS === 'web') {
          alert(`Subtarea delegada a ${director.displayName}`);
        } else {
          Alert.alert('Éxito', `Subtarea delegada a ${director.displayName}`);
        }
      } catch (error) {
        if (__DEV__) console.error('Error delegando subtarea:', error);
        if (Platform.OS === 'web') {
          alert(`Error: ${error.message}`);
        } else {
          Alert.alert('Error', error.message);
        }
      } finally {
        setDelegating(false);
      }
    };

    await doDelegate();
  };

  // Calcular progreso
  const completedCount = subtasks.filter(s => s.status === 'completada').length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const SubtaskItem = ({ item }) => (
    <View>
      <TouchableOpacity
        style={[styles.subtaskItem, item.status === 'completada' && styles.subtaskCompleted]}
        onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
      >
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => handleToggleSubtask(item.id, item.status)}
        >
          {item.status === 'completada' ? (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          ) : (
            <View style={styles.uncheckedBox} />
          )}
        </TouchableOpacity>

        <View style={styles.subtaskContent}>
          <Text
            style={[
              styles.subtaskTitle,
              item.status === 'completada' && styles.subtaskTitleCompleted
            ]}
          >
            {item.title}
          </Text>
          
          {item.completedAt && item.status === 'completada' && (
            <Text style={styles.completedTime}>
              ✓ Completada hace {formatTimeAgo(item.completedAt)}
            </Text>
          )}
        </View>

        <View style={styles.subtaskActions}>
          <TouchableOpacity
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            style={styles.expandButton}
          >
            <Ionicons
              name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Expanded view */}
      {expandedId === item.id && (
        <View style={styles.expandedView}>
          {item.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>Descripción</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>
          )}

          {canDelete && (
            <View style={styles.actionButtons}>
              {/* Botón de delegar (solo si canEdit, canDelegate y hay usuarios disponibles) */}
              {canEdit && canDelegate && delegateUsers.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.delegateButton]}
                  onPress={() => handleOpenDelegateModal(item)}
                >
                  <Ionicons name="person-add-outline" size={16} color="#FFF" />
                  <Text style={styles.actionButtonText}>Delegar</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteSubtask(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Mostrar asignado actual (si existe) */}
          {item.assignedTo && (
            <View style={styles.assignedSection}>
              <View style={styles.assignedBadge}>
                <Ionicons name="person" size={14} color={theme.primary} />
                <Text style={[styles.assignedText, { color: theme.primary }]}>
                  Asignado a: {item.assignedToName || item.assignedTo}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.metadataSection}>
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Creada</Text>
              <Text style={styles.metadataValue}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header con título y progreso */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Subtareas</Text>
          {totalCount > 0 && (
            <Text style={styles.subtitle}>
              {completedCount} de {totalCount} completadas
            </Text>
          )}
        </View>
        {totalCount > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercent}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        )}
      </View>

      {/* Lista de subtareas */}
      {subtasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkbox-outline" size={48} color="#CCC" />
          <Text style={styles.emptyStateText}>
            Sin subtareas
          </Text>
          {canEdit && (
            <Text style={styles.emptyStateHint}>
              Agrega subtareas para desglosar el trabajo
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={subtasks}
          renderItem={({ item }) => <SubtaskItem item={item} />}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Botón para agregar */}
      {canEdit && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddForm(true)}
        >
          <Ionicons name="add-circle" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Agregar Subtarea</Text>
        </TouchableOpacity>
      )}

      {/* Modal para agregar subtarea */}
      <Modal
        visible={showAddForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !loading && setShowAddForm(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => !loading && setShowAddForm(false)}
              style={styles.closeButton}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color={loading ? '#ccc' : '#333'} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nueva Subtarea</Text>
            <TouchableOpacity
              onPress={handleAddSubtask}
              disabled={loading || !newSubtaskTitle.trim()}
              style={[styles.saveButton, { backgroundColor: theme.primary }, (!newSubtaskTitle.trim() || loading) && styles.saveButtonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Crear</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Título *</Text>
              <TextInput
                style={[styles.input, loading && styles.inputDisabled]}
                placeholder="Ej: Investigar requisitos"
                placeholderTextColor="#999"
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, loading && styles.inputDisabled]}
                placeholder="Detalles de la subtarea"
                placeholderTextColor="#999"
                value={newSubtaskDesc}
                onChangeText={setNewSubtaskDesc}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Delegación de Subtarea */}
      <Modal
        visible={showDelegateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDelegateModal(false)}
      >
        <View style={styles.delegateModalOverlay}>
          <View style={styles.delegateModalContent}>
            <View style={styles.delegateModalHeader}>
              <Text style={styles.delegateModalTitle}>Delegar Subtarea</Text>
              <TouchableOpacity onPress={() => setShowDelegateModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedSubtask && (
              <View style={styles.selectedSubtaskInfo}>
                <Ionicons name="checkbox-outline" size={16} color="#666" />
                <Text style={styles.selectedSubtaskTitle} numberOfLines={2}>
                  {selectedSubtask.title}
                </Text>
              </View>
            )}

            <Text style={styles.delegateModalSubtitle}>
              Selecciona un director para asignarle esta subtarea:
            </Text>

            <ScrollView style={styles.delegateUsersList}>
              {delegateUsers.length === 0 ? (
                <View style={styles.noDelegateUsers}>
                  <Ionicons name="people-outline" size={40} color="#999" />
                  <Text style={styles.noDelegateUsersText}>
                    No hay directores disponibles
                  </Text>
                </View>
              ) : (
                delegateUsers.map((director) => (
                  <TouchableOpacity
                    key={director.email}
                    style={styles.delegateUserItem}
                    onPress={() => handleDelegateSubtask(director)}
                    disabled={delegating}
                  >
                    <View style={[styles.delegateUserAvatar, { backgroundColor: theme.primary }]}>
                      <Ionicons name="person" size={20} color="#FFF" />
                    </View>
                    <View style={styles.delegateUserInfo}>
                      <Text style={styles.delegateUserName}>{director.displayName}</Text>
                      <Text style={styles.delegateUserArea}>{director.area}</Text>
                    </View>
                    {delegating ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.delegateCancelButton}
              onPress={() => setShowDelegateModal(false)}
            >
              <Text style={styles.delegateCancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Funciones auxiliares
function formatDate(timestamp) {
  if (!timestamp) return '-';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return '-';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return '1 día';
  return `${diffDays} días`;
}

export default React.memo(SubtasksList);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 16,
    paddingHorizontal: 16,
  },

  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
  },
  progressContainer: {
    marginTop: 12,
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    textAlign: 'right',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateHint: {
    fontSize: 12,
    color: '#CCC',
    marginTop: 4,
  },

  listContent: {
    marginBottom: 16,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DDD',
  },
  subtaskCompleted: {
    backgroundColor: '#F0F9FF',
    borderLeftColor: '#4CAF50',
  },

  checkbox: {
    marginRight: 12,
    padding: 4,
  },
  uncheckedBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 6,
  },

  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  subtaskTitleCompleted: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  completedTime: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },

  subtaskActions: {
    paddingLeft: 8,
  },
  expandButton: {
    padding: 4,
  },

  expandedView: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginHorizontal: 0,
    marginTop: -8,
    paddingLeft: 48,
  },

  descriptionSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  delegateButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },

  // Sección de asignado
  assignedSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  assignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
    alignSelf: 'flex-start',
  },
  assignedText: {
    fontSize: 12,
    color: '#9F2241',
    fontWeight: '500',
  },

  metadataSection: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 8,
  },
  metadataItem: {
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
  },
  metadataValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9F2241',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#9F2241',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: '#F5F5F5',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Estilos del modal de delegación
  delegateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  delegateModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  delegateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  delegateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  selectedSubtaskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  selectedSubtaskTitle: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  delegateModalSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  delegateUsersList: {
    maxHeight: 300,
  },
  noDelegateUsers: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noDelegateUsersText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  delegateUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    marginBottom: 8,
  },
  delegateUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9F2241',
    justifyContent: 'center',
    alignItems: 'center',
  },
  delegateUserInfo: {
    flex: 1,
    marginLeft: 12,
  },
  delegateUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  delegateUserArea: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  delegateCancelButton: {
    backgroundColor: '#EEE',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  delegateCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});
