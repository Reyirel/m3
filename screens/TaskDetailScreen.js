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
import { confirmAlert, showDialog } from '../utils/alert';

// Importar servicios y utilidades
import { toMs } from '../utils/dateUtils';
import { AREAS, getSecretariasForAreas } from '../config/areas';
import { getTitularesByAreas, isDirectorOfSecretario, isTitularOfArea } from '../services/roles';
import { canChangeTaskStatus } from '../services/permissions';
import { updateTask } from '../services/tasks';
import { getAssignedEmails } from '../utils/taskHelpers';
import { getTaskAreas } from '../utils/taskVisibility';
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

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

export default function TaskDetailScreen({ route, navigation }) {
  const { theme, isDark } = useTheme();
  const { showSuccess, showError } = useNotification();
  const { currentUser, tasks } = useTasks();

  // Task a editar o null para crear nueva
  const editingTask = route.params?.task || null;
  const isEditing = !!editingTask;
  // Versión en tiempo real de la tarea: la que llegó por navegación es una copia y no
  // refleja confirmaciones, delegaciones ni cambios de estado hechos después de abrirla
  const liveTask = useMemo(
    () => (editingTask ? tasks.find(t => t.id === editingTask.id) || editingTask : null),
    [tasks, editingTask]
  );

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
  // La tarea se asigna por área: reciben la tarea los responsables de las áreas elegidas,
  // menos los que el administrador desmarque (guardados aquí por correo).
  const [excludedEmails, setExcludedEmails] = useState([]);
  const titularesLoadedRef = useRef(false);
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
          secretaria: d.data().secretaria || '',
          direcciones: d.data().direcciones || [],
          areasPermitidas: d.data().areasPermitidas || [],
        }));

        const userRole = currentUser?.role;
        const directors = allUsers.filter(u => u.role === 'director');

        if (userRole === 'secretario') {
          // Secretario: solo los directores adscritos a su secretaría — SIN fallback a todos
          const ownDirectors = directors.filter(u =>
            u.id !== currentUser?.userId && isDirectorOfSecretario(u, currentUser)
          );
          setAvailableUsers(ownDirectors);
          setDelegateUsers(ownDirectors);
        } else {
          setAvailableUsers(allUsers);
          setDelegateUsers(directors);
        }
      } catch (e) {
        if (__DEV__) console.warn('[TaskDetail] Error cargando usuarios:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser]);

  // Cargar responsables cuando cambian las áreas
  useEffect(() => {
    if (!selectedAreas.length) { setTitulares([]); return; }
    let cancelled = false;
    getTitularesByAreas(selectedAreas)
      .then(result => {
        if (cancelled) return;
        setTitulares(result);
        // Al abrir una tarea existente, los responsables que no estaban asignados
        // empiezan desmarcados: editar el título no debe sumar personas a la tarea.
        if (editingTask && !titularesLoadedRef.current) {
          const alreadyAssigned = getAssignedEmails(editingTask);
          setExcludedEmails(
            result.map(t => normalizeEmail(t.email)).filter(email => email && !alreadyAssigned.includes(email))
          );
        }
        titularesLoadedRef.current = true;
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAreas]);

  // Asignados de una tarea existente que no son titulares de sus áreas (p. ej. delegados)
  const extraAssignees = useMemo(() => {
    const titularEmails = new Set(titulares.map(t => normalizeEmail(t.email)));
    return getAssignedEmails(editingTask)
      .filter(email => !titularEmails.has(email))
      .map(email => {
        const user = availableUsers.find(u => normalizeEmail(u.email) === email);
        return { id: `extra-${email}`, email, displayName: user?.displayName || email, area: user?.area || '', extra: true };
      });
  }, [titulares, editingTask, availableUsers]);

  const responsables = useMemo(
    () => [...titulares.filter(t => t.email), ...extraAssignees],
    [titulares, extraAssignees]
  );
  const assignees = useMemo(
    () => responsables.filter(r => !excludedEmails.includes(normalizeEmail(r.email))),
    [responsables, excludedEmails]
  );
  const areasSinResponsable = useMemo(
    () => selectedAreas.filter(area => !titulares.some(t => isTitularOfArea(t, area))),
    [selectedAreas, titulares]
  );

  const toggleResponsable = useCallback((email) => {
    const key = normalizeEmail(email);
    setExcludedEmails(current =>
      current.includes(key) ? current.filter(e => e !== key) : [...current, key]
    );
  }, []);

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
      showDialog({
        title: 'Descartar cambios',
        message: '¿Deseas salir sin guardar?',
        buttons: [
          { text: 'Seguir editando', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
        ],
      });
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
    const check = canChangeTaskStatus(currentUser, liveTask || { id: taskId }, newStatus);
    if (!check.canChange) {
      showError(check.reason);
      return;
    }
    try {
      // updateTask aplica las reglas del servicio (solo el admin cierra) y actualiza
      // el avance de la tarea principal cuando es la subtarea de un área
      await updateTask(taskId, { status: newStatus });
    } catch (e) {
      showError(e?.code === 'permission-denied' ? e.message : 'Error al actualizar el estado');
    }
  }, [currentUser, liveTask, showError]);

  const handleDelegate = useCallback(async (director) => {
    if (!liveTask || !director) return;
    // El secretario solo delega a directores de su secretaría (el admin, a cualquiera)
    if (currentUser?.role === 'secretario' && !isDirectorOfSecretario(director, currentUser)) {
      showError('Solo puedes delegar a directores de tu secretaría');
      return;
    }
    try {
      const directorEmail = (director.email || '').toLowerCase().trim();
      const directorName = director.displayName || director.name || directorEmail;
      const currentAssigned = getAssignedEmails(liveTask);
      const alreadyAssigned = currentAssigned.includes(directorEmail);
      const newAssigned = alreadyAssigned ? currentAssigned : [...currentAssigned, directorEmail];

      // Nombres y estado por asignado se reconstruyen por correo para que no se desordenen
      const previousAssignments = Array.isArray(liveTask.assignments) ? liveTask.assignments : [];
      const assignments = newAssigned.map(email =>
        previousAssignments.find(a => (a.email || '').toLowerCase().trim() === email) || {
          email,
          name: email === directorEmail ? directorName : email,
          status: 'pendiente',
          completedAt: null,
        }
      );

      const updates = {
        assignedTo: newAssigned,
        assignedToNames: assignments.map(a => a.name || a.email),
        assignments,
        // La secretaría del director delegado también debe poder ver la tarea
        secretarias: [...new Set([
          ...(liveTask.secretarias || []),
          ...getSecretariasForAreas([...getTaskAreas(liveTask), director.secretaria || director.area]),
        ])],
        delegatedTo: directorEmail,
        delegatedBy: currentUser?.email || '',
        delegatedAt: new Date().toISOString(),
      };
      // Si la tarea ya estaba en revisión porque todos habían confirmado, el nuevo
      // asignado aún no confirma: regresa a en proceso
      if (!alreadyAssigned && liveTask.status === 'en_revision') {
        updates.status = 'en_proceso';
      }

      // updateTask funciona también sin conexión: guarda el cambio en la cola
      await updateTask(liveTask.id, updates);
      showSuccess(`Tarea delegada a ${directorName}`);
      setShowDelegateModal(false);
    } catch {
      showError('Error al delegar la tarea');
    }
  }, [liveTask, currentUser, showSuccess, showError]);

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
    if (selectedAreas.length === 0) {
      showError('Debes seleccionar al menos una área');
      return;
    }
    if (assignees.length === 0) {
      showError(
        responsables.length === 0
          ? 'Las áreas elegidas no tienen responsable con cuenta activa: nadie recibiría la tarea'
          : 'Marca al menos a un responsable para que reciba la tarea'
      );
      return;
    }

    // Guardar
    const result = await taskOps.save({
      title: title.trim(),
      description: description.trim(),
      priority,
      status,
      dueAt,
      selectedAssignees: assignees.map(a => ({ email: normalizeEmail(a.email) })),
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
          task={liveTask}
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

            {/* RESPONSABLES POR ÁREA — son quienes reciben la tarea.
                No hay selector de personas aparte: la tarea se asigna por área y aquí
                solo se desmarca a quien no deba recibirla. */}
            {permissions.canEdit && responsables.length > 0 && (
              <View style={[styles.titularesCard, { backgroundColor: theme.primary + '0D', borderColor: theme.primary + '30' }]}>
                <View style={styles.infoCardHeader}>
                  <Ionicons name="people-circle-outline" size={16} color={theme.primary} />
                  <Text style={[styles.infoCardTitle, { color: theme.primary }]}>
                    Se asignará a ({assignees.length} de {responsables.length})
                  </Text>
                </View>
                {responsables.map(t => {
                  const included = !excludedEmails.includes(normalizeEmail(t.email));
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.titularRow}
                      onPress={() => toggleResponsable(t.email)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: included }}
                      accessibilityLabel={`${t.displayName || t.email}: ${included ? 'recibe la tarea' : 'no recibe la tarea'}`}
                    >
                      <Ionicons
                        name={included ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={included ? theme.primary : theme.textSecondary}
                      />
                      <View style={{ flex: 1, opacity: included ? 1 : 0.5 }}>
                        <Text style={[styles.titularName, { color: theme.text }]}>
                          {t.displayName || t.email || t.id}
                        </Text>
                        <Text style={[styles.titularMeta, { color: theme.textSecondary }]}>
                          {t.extra ? 'Asignado adicional' : (t.role === 'secretario' ? 'Secretario/a' : 'Director/a')}
                          {(t.area || (t.areasPermitidas || [])[0]) ? ` · ${(t.area || (t.areasPermitidas || [])[0]).replace(/^(Secretaría|Dirección)\s+(de\s+|del\s+|General\s+)?/i, '')}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ÁREAS SIN RESPONSABLE: nadie recibiría la tarea por esa área */}
            {permissions.canEdit && areasSinResponsable.length > 0 && (
              <View style={[styles.infoCard, { backgroundColor: '#FF95000D', borderColor: '#FF950040' }]}>
                <Ionicons name="warning-outline" size={16} color="#FF9500" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoCardTitle, { color: '#B36B00' }]}>
                    {areasSinResponsable.length === 1 ? 'Área sin responsable' : 'Áreas sin responsable'}
                  </Text>
                  <Text style={[styles.infoCardDesc, { color: theme.textSecondary }]}>
                    {areasSinResponsable.join(', ')} no {areasSinResponsable.length === 1 ? 'tiene' : 'tienen'} una cuenta activa asignada, así que nadie recibirá la tarea por {areasSinResponsable.length === 1 ? 'esa área' : 'esas áreas'}.
                  </Text>
                </View>
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
