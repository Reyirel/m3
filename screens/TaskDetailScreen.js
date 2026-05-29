/**
 * screens/TaskDetailScreenNew.js
 * 
 * REFACTORED TaskDetailScreen - VERSIÓN LIMPIA
 * Orquestador que usa los 8 componentes descompuestos
 * ~800 líneas vs 3349 del original
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  TouchableOpacity,
  Text,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTasks } from '../contexts/TasksContext';
import PrimaryButton from '../components/ui/PrimaryButton';

// Importar componentes refactorizados
import {
  TaskHeader,
  TaskFormBasic,
  TaskAdvancedOptions,
  TaskAISuggestions,
  TaskSubtasksSection,
  ReadOnlyTaskModal,
  DelegateTaskModal,
  AssigneeChangeConfirmModal,
} from '../components/task';

// Importar selectores avanzados
import {
  PrioritySelector,
  StatusSelector,
  AreaSelector,
  AssigneeSelector,
  DateSelector,
} from '../components';

// Importar hooks
import useTaskPermissions from '../hooks/useTaskPermissions';
import useTaskOperations from '../hooks/useTaskOperations';
import { confirmAlert } from '../utils/alert';

// Importar servicios y utilidades
import { toMs } from '../utils/dateUtils';
import { AREAS } from '../config/areas';
import { getAllUsersNames, getTitularesByAreas } from '../services/roles';
import {
  findSimilarTasks,
  suggestTaskMetadata,
  suggestPriority,
  suggestDueDate,
} from '../utils/aiFeatures';

// DateTimePicker solo en móvil
let DateTimePicker;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

export default function TaskDetailScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { currentUser, tasks } = useTasks();

  // Task a editar o null para crear nueva
  const editingTask = route.params?.task || null;
  const isEditing = !!editingTask;

  // Permisos (usando hook)
  const permissions = useTaskPermissions(
    editingTask,
    currentUser,
    currentUser?.role || 'admin'
  );

  // Operaciones (usando hook)
  const taskOps = useTaskOperations(editingTask, currentUser);

  // ────────────────────────────────────────────────────────────
  // FORM STATE
  // ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(editingTask?.title || '');
  const [description, setDescription] = useState(editingTask?.description || '');
  const [priority, setPriority] = useState(editingTask?.priority || 'media');
  const [status, setStatus] = useState(editingTask?.status || 'pendiente');

  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  };
  const [dueAt, setDueAt] = useState(
    editingTask ? new Date(toMs(editingTask.dueAt)) : getDefaultDate()
  );

  // ────────────────────────────────────────────────────────────
  // ASSIGNEES & AREAS STATE
  // ────────────────────────────────────────────────────────────
  const [availableUsers, setAvailableUsers] = useState([]);
  const [titulares, setTitulares] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState(
    editingTask?.assignedTo && Array.isArray(editingTask.assignedTo)
      ? editingTask.assignedTo
      : editingTask?.assignedTo
      ? [editingTask.assignedTo]
      : []
  );
  const [selectedAreas, setSelectedAreas] = useState(
    editingTask?.areas && Array.isArray(editingTask.areas)
      ? editingTask.areas
      : editingTask?.area
      ? [editingTask.area]
      : []
  );

  // ────────────────────────────────────────────────────────────
  // ADVANCED OPTIONS STATE
  // ────────────────────────────────────────────────────────────
  const [isRecurring, setIsRecurring] = useState(
    editingTask?.isRecurring || false
  );
  const [recurrencePattern, setRecurrencePattern] = useState(
    editingTask?.recurrencePattern || 'daily'
  );
  const [tags, setTags] = useState(editingTask?.tags || []);
  const [notifyBefore, setNotifyBefore] = useState(editingTask?.notifyBefore || 0);

  // ────────────────────────────────────────────────────────────
  // MODAL STATES
  // ────────────────────────────────────────────────────────────
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showPomodoroModal, setShowPomodoroModal] = useState(false);
  const [showAssigneeChangeConfirm, setShowAssigneeChangeConfirm] = useState(false);
  const [tempDate, setTempDate] = useState(dueAt);

  // ────────────────────────────────────────────────────────────
  // AI SUGGESTIONS STATE
  // ────────────────────────────────────────────────────────────
  const [similarTasks, setSimilarTasks] = useState([]);
  const [metaSuggestion, setMetaSuggestion] = useState(null);
  const [prioritySuggestion, setPrioritySuggestion] = useState(null);
  const [dateSuggestion, setDateSuggestion] = useState(null);
  const aiDebounceRef = useRef(null);

  // ────────────────────────────────────────────────────────────
  // OTHER STATE
  // ────────────────────────────────────────────────────────────
  const [delegateUsers, setDelegateUsers] = useState([]);
  const [assigneeConfirmations, setAssigneeConfirmations] = useState([]);
  const [assigneeChangeData, setAssigneeChangeData] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Cargar usuarios activos para el selector de asignados
  // Si el usuario es secretario, solo muestra los directores de sus direcciones adscritas
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getDocs, collection, query, where } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const snap = await getDocs(
          query(collection(db, 'users'), where('active', '==', true))
        );
        if (cancelled) return;
        const allUsers = snap.docs.map(d => ({
          id: d.id,
          name: d.data().displayName || d.data().email || d.id,
          displayName: d.data().displayName || d.data().email || d.id,
          email: d.data().email || '',
          avatar: d.data().photoURL || null,
          role: d.data().role || '',
          area: d.data().area || '',
          direcciones: d.data().direcciones || [],
          areasPermitidas: d.data().areasPermitidas || [],
        }));

        const normalizeStr = (s) => (s || '').trim().toLowerCase();
        const userRole = currentUser?.role;
        const userDirecciones = currentUser?.direcciones || [];

        // Secretario: solo directores adscritos a sus direcciones
        if (userRole === 'secretario' && userDirecciones.length > 0) {
          const filtered = allUsers.filter(u => {
            if (u.id === currentUser?.id) return false;
            if (u.role === 'admin') return true;
            if (u.role === 'director') {
              const uAreas = [u.area, ...(u.areasPermitidas || [])].map(normalizeStr).filter(Boolean);
              return userDirecciones.some(dir => {
                const d = normalizeStr(dir);
                return uAreas.some(a => a.includes(d) || d.includes(a));
              });
            }
            return false;
          });
          setAvailableUsers(filtered.length > 0 ? filtered : allUsers);
        } else {
          setAvailableUsers(allUsers);
        }

        // Poblar directores para delegación
        const directors = allUsers.filter(u => u.role === 'director');
        if (userRole === 'secretario' && userDirecciones.length > 0) {
          const filteredDirs = directors.filter(u => {
            const uAreas = [u.area, ...(u.areasPermitidas || [])].map(normalizeStr).filter(Boolean);
            return userDirecciones.some(dir => {
              const d = normalizeStr(dir);
              return uAreas.some(a => a.includes(d) || d.includes(a));
            });
          });
          setDelegateUsers(filteredDirs.length > 0 ? filteredDirs : directors);
        } else {
          setDelegateUsers(directors);
        }
      } catch (e) {
        if (__DEV__) console.warn('[TaskDetail] Error cargando usuarios:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.role, currentUser?.id, currentUser?.direcciones]);

  // Cargar responsables cuando cambian las áreas
  useEffect(() => {
    if (!selectedAreas.length) { setTitulares([]); return; }
    let cancelled = false;
    getTitularesByAreas(selectedAreas)
      .then(result => { if (!cancelled) setTitulares(result); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedAreas]);

  // ────────────────────────────────────────────────────────────
  // AI ANALYSIS (Debounced)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditing || !title || title.length < 6) {
      setSimilarTasks([]);
      setMetaSuggestion(null);
      setPrioritySuggestion(null);
      setDateSuggestion(null);
      return;
    }

    clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(() => {
      setSimilarTasks(findSimilarTasks(title, tasks));
      const meta = suggestTaskMetadata(title, tasks);
      setMetaSuggestion(meta.area ? meta : null);
      const priSug = suggestPriority(title, description);
      setPrioritySuggestion(
        priSug.priority && priSug.priority !== 'baja' ? priSug : null
      );
      const dateSug = suggestDueDate(title, selectedAreas[0] || '', tasks);
      setDateSuggestion(dateSug.suggestedDate ? dateSug : null);
    }, 600);

    return () => clearTimeout(aiDebounceRef.current);
  }, [title, description, tasks, isEditing, selectedAreas]);

  // ────────────────────────────────────────────────────────────
  // HANDLERS
  // ────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    const hasChanges = isEditing
      ? title !== editingTask.title || description !== editingTask.description
      : title.trim() !== '' || description.trim() !== '';

    if (hasChanges) {
      if (Platform.OS === 'web') {
        if (window.confirm('¿Descartar cambios?')) {
          navigation.goBack();
        }
      } else {
        Alert.alert(
          'Descartar cambios',
          '¿Deseas salir sin guardar?',
          [
            { text: 'Seguir editando', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
          ]
        );
      }
    } else {
      navigation.goBack();
    }
  }, [isEditing, editingTask, title, description, navigation]);

  const handleDelete = () => {
    if (!permissions.canDelete) return;

    confirmAlert(
      'Eliminar tarea',
      '¿Estás seguro? Esta acción es irreversible.',
      async () => {
        const result = await taskOps.deleteTask(editingTask.id);
        if (result) navigation.goBack();
      },
      'Eliminar'
    );
  };

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      showError('Error al actualizar el estado');
    }
  }, [showError]);

  const handleDelegate = useCallback(async (director) => {
    if (!editingTask || !director) return;
    try {
      const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'tasks', editingTask.id), {
        assignedTo: arrayUnion(director.email),
        delegatedTo: director.email,
        delegatedBy: currentUser?.email || '',
        delegatedAt: new Date().toISOString(),
      });
      showSuccess(`Tarea delegada a ${director.displayName || director.name}`);
      setShowDelegateModal(false);
    } catch {
      showError('Error al delegar la tarea');
    }
  }, [editingTask, currentUser, showSuccess, showError]);

  const handleSave = async () => {
    if (taskOps.isSaving) return;

    // Validaciones
    if (!title.trim()) {
      showError('El título es obligatorio');
      return;
    }
    if (!description.trim()) {
      showError('La descripción es obligatoria');
      return;
    }
    if (selectedAssignees.length === 0) {
      showError('Debes asignar la tarea a al menos una persona');
      return;
    }
    if (selectedAreas.length === 0) {
      showError('Debes seleccionar al menos una área');
      return;
    }

    // Guardar
    const result = await taskOps.save({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueAt,
      selectedAssignees,
      selectedAreas,
      isRecurring,
      recurrencePattern,
      tags,
      notifyBefore,
    });

    if (result) {
      navigation.goBack();
    }
  };

  const onChangeDate = useCallback((event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        setTimeout(() => setShowTimePicker(true), 100);
      } else {
        const newDate = new Date(dueAt);
        newDate.setFullYear(selectedDate.getFullYear());
        newDate.setMonth(selectedDate.getMonth());
        newDate.setDate(selectedDate.getDate());
        setDueAt(newDate);
      }
    }
  }, [dueAt]);

  const onChangeTime = useCallback((event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedTime) {
      const finalDate = new Date(tempDate);
      finalDate.setHours(selectedTime.getHours());
      finalDate.setMinutes(selectedTime.getMinutes());
      setDueAt(finalDate);
    }
  }, [tempDate]);

  // Mostrar modal de solo lectura si es read-only
  if (permissions.isReadOnly && editingTask) {
    return (
      <>
        <ReadOnlyTaskModal
          task={editingTask}
          navigation={navigation}
          theme={theme}
          canAddSubtask={permissions.canAddSubtask}
          canDelegate={permissions.canDelegate}
          delegateUsers={delegateUsers}
          currentUser={currentUser}
          onStatusChange={handleStatusChange}
          onOpenDelegate={() => setShowDelegateModal(true)}
        />
        <DelegateTaskModal
          visible={showDelegateModal}
          onClose={() => setShowDelegateModal(false)}
          delegateUsers={delegateUsers}
          task={editingTask}
          currentUser={currentUser}
          theme={theme}
          onDelegate={handleDelegate}
        />
      </>
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* HEADER */}
        <TaskHeader
          isEditing={isEditing}
          canDelete={permissions.canDelete}
          onClose={handleBack}
          onDelete={handleDelete}
          onShowPomodoro={() => setShowPomodoroModal(true)}
        />

        {/* CONTENT */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* FORM BASIC */}
            <TaskFormBasic
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              isReadOnly={!permissions.canEdit}
            />

            {/* ENHANCED SELECTORS - PRIORITY */}
            {permissions.canEdit && (
              <PrioritySelector
                value={priority}
                onChange={setPriority}
              />
            )}

            {/* ENHANCED SELECTORS - STATUS */}
            {permissions.canEdit && (
              <StatusSelector
                value={status}
                onChange={setStatus}
              />
            )}

            {/* ENHANCED SELECTORS - AREAS */}
            {permissions.canEdit && (
              <AreaSelector
                value={selectedAreas}
                onChange={setSelectedAreas}
                multiple={true}
              />
            )}

            {/* RESPONSABLES POR ÁREA */}
            {permissions.canEdit && titulares.length > 0 && (
              <View style={[styles.titularesCard, { backgroundColor: theme.primary + '0D', borderColor: theme.primary + '30' }]}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="people-circle-outline" size={16} color={theme.primary} />
                  <Text style={[styles.infoCardTitle, { color: theme.primary }]}>
                    Responsables de {selectedAreas.length > 1 ? 'las áreas' : 'esta área'}
                  </Text>
                </View>
                {titulares.map(t => (
                  <View key={t.id} style={styles.titularRow}>
                    <View style={[styles.titularDot, { backgroundColor: t.role === 'secretario' ? theme.primary : theme.info || '#007AFF' }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.titularName, { color: theme.text }]}>
                        {t.displayName || t.email || t.id}
                      </Text>
                      <Text style={[styles.titularMeta, { color: theme.textSecondary }]}>
                        {t.role === 'secretario' ? 'Secretario/a' : 'Director/a'}
                        {(t.area || (t.areasPermitidas || [])[0]) ? ` · ${(t.area || (t.areasPermitidas || [])[0]).replace(/^(Secretaría|Dirección)\s+(de\s+|del\s+|General\s+)?/i, '')}` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* AVISO DE TAREA COORDINADA */}
            {permissions.canEdit && !isEditing && selectedAreas.length > 1 && (
              <View style={[styles.infoCard, { backgroundColor: '#007AFF0D', borderColor: '#007AFF30' }]}>
                <Ionicons name="git-branch-outline" size={16} color="#007AFF" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoCardTitle, { color: '#007AFF' }]}>Tarea coordinada</Text>
                  <Text style={[styles.infoCardDesc, { color: theme.textSecondary }]}>
                    Se creará una subtarea por cada área ({selectedAreas.length} en total). Cada responsable podrá gestionarla de forma independiente.
                  </Text>
                </View>
              </View>
            )}

            {/* ENHANCED SELECTORS - ASSIGNEES */}
            {permissions.canEdit && (
              <AssigneeSelector
                value={selectedAssignees}
                onChange={setSelectedAssignees}
                availableUsers={availableUsers}
              />
            )}

            {/* ENHANCED SELECTORS - DATE */}
            {permissions.canEdit && (
              <DateSelector
                value={dueAt}
                onChange={setDueAt}
                showTime={true}
              />
            )}

            {/* ADVANCED OPTIONS */}
            <TaskAdvancedOptions
              isRecurring={isRecurring}
              onRecurringChange={setIsRecurring}
              recurrencePattern={recurrencePattern}
              onRecurrencePatternChange={setRecurrencePattern}
              tags={tags}
              onTagsChange={setTags}
              notifyBefore={notifyBefore}
              onNotifyBeforeChange={setNotifyBefore}
              isReadOnly={!permissions.canEdit}
            />

            {/* AI SUGGESTIONS */}
            <TaskAISuggestions
              isLoading={false}
              suggestions={{
                priority: prioritySuggestion,
                dueDate: dateSuggestion,
                subtasks: [],
                similarTasks,
              }}
              isReadOnly={!permissions.canEdit}
            />

            {/* SUBTASKS */}
            {editingTask && (
              <TaskSubtasksSection
                task={editingTask}
                title={title}
                description={description}
                canAddSubtask={permissions.canAddSubtask}
                canEdit={permissions.canEdit}
              />
            )}

            {/* SAVE BUTTON */}
            {permissions.canEdit && (
              <View style={styles.saveWrapper}>
                <PrimaryButton
                  title={
                    taskOps.isSaving
                      ? `Guardando... ${taskOps.saveProgress || 0}%`
                      : isEditing
                      ? 'Actualizar'
                      : 'Crear Tarea'
                  }
                  onPress={handleSave}
                  loading={taskOps.isSaving}
                  icon={taskOps.isSaving ? 'hourglass' : 'checkmark-circle'}
                />
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* MODALS */}
      {showDatePicker && Platform.OS !== 'web' && DateTimePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      {showTimePicker && Platform.OS !== 'web' && DateTimePicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="default"
          onChange={onChangeTime}
        />
      )}

      {/* DELEGATE MODAL */}
      <DelegateTaskModal
        visible={showDelegateModal}
        onClose={() => setShowDelegateModal(false)}
        delegateUsers={delegateUsers}
        task={editingTask}
        currentUser={currentUser}
        theme={theme}
        onDelegate={handleDelegate}
      />

      {/* ASSIGNEE CHANGE CONFIRMATION */}
      <AssigneeChangeConfirmModal
        visible={showAssigneeChangeConfirm}
        data={assigneeChangeData}
        onConfirm={() => {
          setShowAssigneeChangeConfirm(false);
          handleSave();
        }}
        onCancel={() => {
          setShowAssigneeChangeConfirm(false);
          setAssigneeChangeData(null);
        }}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  saveWrapper: {
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  titularesCard: {
    flexDirection: 'column',
    gap: 4,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  infoCardDesc: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    marginTop: 3,
  },
  titularRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  titularDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  titularName: {
    fontSize: 13,
    fontWeight: '600',
  },
  titularMeta: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
});
