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
import AmbientOrbs from '../components/AmbientOrbs';
import { PremiumGlassCard, GlassmorphicButton } from '../components'; // ✨ UPGRADED: Premium Glassmorphism
import { useGlassmorphism } from '../hooks/useGlassmorphism'; // ✨ NEW: Glassmorphism config

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
  const [selectedAssignees, setSelectedAssignees] = useState([]);
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

    Alert.alert(
      'Eliminar tarea',
      '¿Estás seguro? Esta acción es irreversible.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await taskOps.deleteTask(editingTask.id);
            if (result) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

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
      <ReadOnlyTaskModal
        task={editingTask}
        navigation={navigation}
        theme={theme}
        canAddSubtask={permissions.canAddSubtask}
      />
    );
  }

  // ────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <AmbientOrbs intensity="medium" />

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
                selected={selectedAreas}
                onChange={setSelectedAreas}
              />
            )}

            {/* ENHANCED SELECTORS - ASSIGNEES */}
            {permissions.canEdit && (
              <AssigneeSelector
                selected={selectedAssignees}
                onChange={setSelectedAssignees}
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
              <GlassmorphicButton
                title={
                  taskOps.isSaving
                    ? `Guardando... ${taskOps.saveProgress || 0}%`
                    : isEditing
                    ? 'Actualizar'
                    : 'Crear Tarea'
                }
                onPress={handleSave}
                variant="primary"
                size="large"
                loading={taskOps.isSaving}
                icon={taskOps.isSaving ? 'hourglass' : 'checkmark-circle'}
              />
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
        theme={theme}
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
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
});
